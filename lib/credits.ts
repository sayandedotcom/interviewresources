import { cache } from "react";

import { and, eq, sql } from "drizzle-orm";

import { db } from "./db/index";
import {
  creditsLedger,
  paymentDisputes,
  paymentRefunds,
  payments,
  productEvents,
  users,
} from "./db/schema";
import {
  ECONOMICS,
  ECONOMICS_VERSION,
  estimateDodoTransactionFeeMicros,
  getCatalogPack,
  usdToMicros,
} from "./economics";

/**
 * The pure credit math lives in lib/pricing.ts so the browser can price a run
 * without importing this module's db connection. Re-exported here because
 * server code has always imported both halves from "@/lib/credits".
 */
export * from "./pricing";

/**
 * Balance is derived, never stored: the ledger is the source of truth.
 *
 * Memoised per request, because the `(app)` layout and its page each want the
 * balance for the same user. Anything that spends credits must read the balance
 * `chargeCredits` returns rather than calling this again in the same request —
 * this would answer with the pre-charge figure.
 */
export const getBalance = cache(async (userId: string): Promise<number> => {
  const [row] = await db
    .select({ balance: sql<number>`coalesce(sum(${creditsLedger.delta}), 0)::int` })
    .from(creditsLedger)
    .where(eq(creditsLedger.userId, userId));

  return row?.balance ?? 0;
});

/**
 * Whether one specific Dodo payment has landed in this user's ledger yet.
 *
 * The success page cannot infer this from the balance. A returning customer is
 * already sitting on credits when they arrive, so "balance > 0" answers yes for
 * a purchase whose webhook has not arrived — and would keep answering yes if it
 * never arrived at all. `paymentRef` is unique, so this is an exact answer.
 *
 * Scoped by userId as well as the ref: the payment id travels in the return URL
 * where the client controls it, and without the user check one account could
 * probe whether another's payment had settled.
 */
export async function isPaymentCredited(userId: string, paymentRef: string): Promise<boolean> {
  const [row] = await db
    .select({ id: creditsLedger.id })
    .from(creditsLedger)
    .where(and(eq(creditsLedger.userId, userId), eq(creditsLedger.paymentRef, paymentRef)))
    .limit(1);

  return row != null;
}

/**
 * Direct ledger charge for non-reserved work. New provider-backed work should
 * reserve first and settle below; this guard refuses a negative balance.
 */
export async function chargeCredits(opts: {
  userId: string;
  credits: number;
  reason: string;
  researchId?: string;
}): Promise<{ balanceAfter: number }> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from ${users} where ${users.id} = ${opts.userId} for update`);

    const [before] = await tx
      .select({ balance: sql<number>`coalesce(sum(${creditsLedger.delta}), 0)::int` })
      .from(creditsLedger)
      .where(eq(creditsLedger.userId, opts.userId));
    if (opts.credits > (before?.balance ?? 0)) {
      throw new Error("insufficient credits for charge");
    }

    await tx.insert(creditsLedger).values({
      userId: opts.userId,
      delta: -opts.credits,
      reason: opts.reason,
      researchId: opts.researchId,
    });

    const [row] = await tx
      .select({ balance: sql<number>`coalesce(sum(${creditsLedger.delta}), 0)::int` })
      .from(creditsLedger)
      .where(eq(creditsLedger.userId, opts.userId));

    return { balanceAfter: row?.balance ?? 0 };
  });
}

export interface CreditReservation {
  reference: string;
  reservedCredits: number;
  balanceBefore: number;
}

export type ReserveCreditsResult =
  | { status: "reserved"; reservation: CreditReservation }
  | { status: "insufficient_credits"; balance: number };

/** Atomically removes a bounded provider budget from the spendable balance. */
export async function reserveCredits(opts: {
  userId: string;
  minimumCredits: number;
  maximumCredits: number;
  reference: string;
  reason: string;
  researchId?: string;
}): Promise<ReserveCreditsResult> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from ${users} where ${users.id} = ${opts.userId} for update`);
    const [row] = await tx
      .select({ balance: sql<number>`coalesce(sum(${creditsLedger.delta}), 0)::int` })
      .from(creditsLedger)
      .where(eq(creditsLedger.userId, opts.userId));
    const balance = row?.balance ?? 0;
    if (balance < opts.minimumCredits) {
      return { status: "insufficient_credits" as const, balance };
    }

    const reservedCredits = Math.min(balance, opts.maximumCredits);
    await tx.insert(creditsLedger).values({
      userId: opts.userId,
      delta: -reservedCredits,
      reason: `${opts.reason}:reservation`,
      paymentRef: `reservation:${opts.reference}`,
      researchId: opts.researchId,
    });
    return {
      status: "reserved" as const,
      reservation: { reference: opts.reference, reservedCredits, balanceBefore: balance },
    };
  });
}

/**
 * Finalizes a reservation by returning the unused portion. The reservation and
 * settlement rows leave an append-only audit trail and make retries idempotent.
 */
export async function settleCreditReservation(opts: {
  userId: string;
  reference: string;
  actualCredits: number;
  reason: string;
  researchId?: string;
}): Promise<{ balanceAfter: number; reservedCredits: number }> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from ${users} where ${users.id} = ${opts.userId} for update`);
    const [reservation] = await tx
      .select({ delta: creditsLedger.delta })
      .from(creditsLedger)
      .where(
        and(
          eq(creditsLedger.userId, opts.userId),
          eq(creditsLedger.paymentRef, `reservation:${opts.reference}`)
        )
      )
      .for("update")
      .limit(1);
    if (!reservation || reservation.delta >= 0) {
      throw new Error("credit reservation not found");
    }

    const reservedCredits = -reservation.delta;
    if (opts.actualCredits < 0 || opts.actualCredits > reservedCredits) {
      throw new Error("actual charge exceeds reserved credits");
    }

    await tx
      .insert(creditsLedger)
      .values({
        userId: opts.userId,
        delta: reservedCredits - opts.actualCredits,
        reason: opts.reason,
        paymentRef: `reservation-settlement:${opts.reference}`,
        researchId: opts.researchId,
      })
      .onConflictDoNothing({ target: creditsLedger.paymentRef });

    const [row] = await tx
      .select({ balance: sql<number>`coalesce(sum(${creditsLedger.delta}), 0)::int` })
      .from(creditsLedger)
      .where(eq(creditsLedger.userId, opts.userId));
    return { balanceAfter: row?.balance ?? 0, reservedCredits };
  });
}

export function releaseCreditReservation(opts: {
  userId: string;
  reference: string;
  reason: string;
  researchId?: string;
}) {
  return settleCreditReservation({ ...opts, actualCredits: 0 });
}

/**
 * Returns budgets stranded by a terminated route handler. The settlement ref
 * is unique, so this is safe to race with a late successful settlement; at
 * most one of them can finalize a reservation.
 */
export async function reapStaleCreditReservations(
  cutoff: Date = new Date(Date.now() - 15 * 60 * 1_000)
): Promise<number> {
  const released = await db.execute(sql`
    insert into "credits_ledger" (
      "user_id",
      "delta",
      "reason",
      "payment_ref",
      "research_id"
    )
    select
      reservation."user_id",
      -reservation."delta",
      'stale_reservation_release',
      replace(reservation."payment_ref", 'reservation:', 'reservation-settlement:'),
      reservation."research_id"
    from "credits_ledger" reservation
    where reservation."payment_ref" like 'reservation:%'
      and reservation."delta" < 0
      and reservation."created_at" < ${cutoff}
    on conflict ("payment_ref") do nothing
    returning "id"
  `);

  const result = released as unknown as { rows?: unknown[] } | unknown[];
  return Array.isArray(result) ? result.length : (result.rows?.length ?? 0);
}

/**
 * Credits a purchase. Idempotent via the unique constraint on paymentRef —
 * Dodo redelivers webhooks, and a redelivery must not double-grant.
 * Returns false when the payment was already applied.
 */
export async function grantCredits(opts: {
  userId: string;
  credits: number;
  reason: string;
  paymentRef: string;
}): Promise<boolean> {
  const inserted = await db
    .insert(creditsLedger)
    .values({
      userId: opts.userId,
      delta: opts.credits,
      reason: opts.reason,
      paymentRef: opts.paymentRef,
    })
    .onConflictDoNothing({ target: creditsLedger.paymentRef })
    .returning({ id: creditsLedger.id });

  return inserted.length > 0;
}

/**
 * Persists the provider's actual charge and grants its credits in one
 * transaction. The provider payment id is unique in both records, so webhook
 * redelivery is a clean no-op rather than a second grant.
 */
export async function settlePayment(opts: {
  userId: string;
  credits: number;
  reason: string;
  paymentRef: string;
  amountMinor: number;
  currency: string;
  pack: string;
  catalogPriceUsdMinor?: number;
  estimatedDodoFeeMicros?: number;
  economicsVersion?: string;
}): Promise<boolean> {
  const catalogPack = getCatalogPack(opts.pack);
  const catalogPriceUsdMinor =
    opts.catalogPriceUsdMinor ??
    catalogPack?.priceUsdMinor ??
    (opts.currency.toUpperCase() === "USD" ? opts.amountMinor : 0);
  const estimatedDodoFeeMicros =
    opts.estimatedDodoFeeMicros ?? estimateDodoTransactionFeeMicros(catalogPriceUsdMinor);

  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(payments)
      .values({
        userId: opts.userId,
        providerPaymentId: opts.paymentRef,
        amountMinor: opts.amountMinor,
        currency: opts.currency.toUpperCase(),
        pack: opts.pack,
        catalogPriceUsdMinor,
        creditsGranted: opts.credits,
        estimatedDodoFeeMicros,
        economicsVersion: opts.economicsVersion ?? ECONOMICS_VERSION,
      })
      .onConflictDoNothing({ target: payments.providerPaymentId })
      .returning({ id: payments.id });

    if (inserted.length === 0) return false;

    await tx.insert(creditsLedger).values({
      userId: opts.userId,
      delta: opts.credits,
      reason: opts.reason,
      paymentRef: opts.paymentRef,
    });
    await tx.insert(productEvents).values({
      userId: opts.userId,
      name: "payment_succeeded",
      properties: {
        paymentRef: opts.paymentRef,
        amountMinor: opts.amountMinor,
        currency: opts.currency.toUpperCase(),
        pack: opts.pack,
        credits: opts.credits,
        catalogPriceUsdMinor,
        estimatedDodoFeeMicros,
        economicsVersion: opts.economicsVersion ?? ECONOMICS_VERSION,
      },
    });
    return true;
  });
}

/**
 * Applies a successful full or partial refund once and reverses the
 * proportional credit grant. Cumulative rounding keeps multiple partial
 * refunds from reversing more credits than the purchase granted.
 */
export async function reverseRefund(opts: {
  paymentRef: string;
  refundRef: string;
  amountMinor: number;
  currency: string;
}): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.providerPaymentId, opts.paymentRef))
      .for("update")
      .limit(1);

    if (!payment) return false;

    const refundAmount = Math.max(
      0,
      Math.min(opts.amountMinor, payment.amountMinor - payment.refundedAmountMinor)
    );
    if (refundAmount === 0) return false;

    const totalRefunded = payment.refundedAmountMinor + refundAmount;
    const targetCreditsReversed = Math.min(
      payment.creditsGranted,
      Math.round((payment.creditsGranted * totalRefunded) / payment.amountMinor)
    );
    const creditsToReverse = targetCreditsReversed - payment.creditsReversed;

    const inserted = await tx
      .insert(paymentRefunds)
      .values({
        paymentId: payment.id,
        providerRefundId: opts.refundRef,
        amountMinor: refundAmount,
        currency: opts.currency.toUpperCase(),
        creditsReversed: creditsToReverse,
        estimatedFeeMicros: usdToMicros(ECONOMICS.providers.dodo.refundFeeUsd),
        economicsVersion: ECONOMICS_VERSION,
      })
      .onConflictDoNothing({ target: paymentRefunds.providerRefundId })
      .returning({ id: paymentRefunds.id });
    if (inserted.length === 0) return false;

    await tx
      .update(payments)
      .set({
        refundedAmountMinor: totalRefunded,
        creditsReversed: targetCreditsReversed,
        status: totalRefunded >= payment.amountMinor ? "refunded" : "partially_refunded",
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    if (creditsToReverse > 0) {
      await tx.insert(creditsLedger).values({
        userId: payment.userId,
        delta: -creditsToReverse,
        reason: "payment_refund",
        paymentRef: `refund:${opts.refundRef}`,
      });
    }
    await tx.insert(productEvents).values({
      userId: payment.userId,
      name: "payment_refunded",
      properties: {
        paymentRef: opts.paymentRef,
        refundRef: opts.refundRef,
        amountMinor: refundAmount,
        currency: opts.currency.toUpperCase(),
        creditsReversed: creditsToReverse,
      },
    });
    return true;
  });
}

/** Upserts the latest lifecycle state for one provider dispute. */
export async function recordPaymentDispute(opts: {
  paymentRef: string;
  disputeRef: string;
  amountMinor: number;
  currency: string;
  status: (typeof paymentDisputes.status.enumValues)[number];
}): Promise<boolean> {
  const [payment] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.providerPaymentId, opts.paymentRef))
    .limit(1);
  if (!payment) return false;

  await db
    .insert(paymentDisputes)
    .values({
      paymentId: payment.id,
      providerDisputeId: opts.disputeRef,
      amountMinor: Math.max(0, Math.round(opts.amountMinor)),
      currency: opts.currency.toUpperCase(),
      status: opts.status,
      estimatedFeeMicros: usdToMicros(ECONOMICS.providers.dodo.disputeFeeUsd),
      economicsVersion: ECONOMICS_VERSION,
    })
    .onConflictDoUpdate({
      target: paymentDisputes.providerDisputeId,
      set: { status: opts.status, updatedAt: new Date() },
    });
  return true;
}
