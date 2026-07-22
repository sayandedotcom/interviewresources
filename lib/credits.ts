import { cache } from "react";

import { and, eq, sql } from "drizzle-orm";

import { db } from "./db/index";
import { creditsLedger, users } from "./db/schema";

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
 * Charges a completed run. Takes a row lock on the user so two concurrent runs
 * can't both read the same balance and each spend it.
 *
 * The charge is unconditional: by the time we get here the money is already
 * spent with Gemini and Tavily. The pre-flight check in the research route is
 * what stops a user starting a run they can't afford, so the worst case is a
 * user who raced two runs ending slightly negative — which just blocks their
 * next run until they top up.
 */
export async function chargeCredits(opts: {
  userId: string;
  credits: number;
  reason: string;
  researchId?: string;
}): Promise<{ balanceAfter: number }> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from ${users} where ${users.id} = ${opts.userId} for update`);

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
