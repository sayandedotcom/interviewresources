import { eq, sql } from "drizzle-orm";

import { db } from "./db/index";
import { creditsLedger, users } from "./db/schema";
import { EFFORT_LEVELS, EFFORT_PRESETS, type Effort, MAX_EFFORT_CAP_USD } from "./research/budget";

/** 1 credit = $0.01. Packs: Starter $1 → 100, Bundle $5 → 550, Max $10 → 1200. */
export const USD_PER_CREDIT = 0.01;

/** Users pay the run's real metered cost times this. Covers payment fees + retries. */
export const CREDIT_MARKUP = 1.3;

/**
 * The most a single run can ever cost: the priciest effort's cap, since the
 * pipeline hard-stops there. Note this exceeds the 100-credit Starter pack, which
 * is why we do NOT gate on it — see creditsToBudgetUsd.
 */
export const MAX_RUN_CREDITS = Math.ceil((MAX_EFFORT_CAP_USD * CREDIT_MARKUP) / USD_PER_CREDIT);

/**
 * Floor to start a run at all. Below this the pipeline's dollar budget is too
 * small to gather enough evidence for a report worth reading.
 */
export const MIN_RUN_CREDITS = 50;

/**
 * Extensions ("more questions", "scout another round") reuse the same pipeline
 * but produce a fraction of a full report, so they get a smaller floor and a
 * tighter dollar cap than a fresh run.
 */
export const MIN_EXTEND_CREDITS = 25;
export const EXTEND_CAP_USD = 0.5;

/**
 * A typical run lands near $0.35 → ~46 credits. Rounded to 6dp before ceil:
 * the round-trip through creditsToBudgetUsd otherwise lands on values like
 * 56.00000000000001, and a bare ceil would overcharge by a credit.
 */
export function usdToCredits(usd: number): number {
  const credits = (usd * CREDIT_MARKUP) / USD_PER_CREDIT;
  return Math.ceil(Number(credits.toFixed(6)));
}

/**
 * The dollar budget a balance can pay for, inverse of usdToCredits. The route
 * caps each run at min(effort cap, this) so the final charge can never exceed
 * what the user holds — that's what keeps balances non-negative without a
 * reservation.
 */
export function creditsToBudgetUsd(credits: number): number {
  return (credits * USD_PER_CREDIT) / CREDIT_MARKUP;
}

/** Credit ceiling per effort level, so the form can price each choice. */
export function effortCredits(): Record<Effort, number> {
  return Object.fromEntries(
    EFFORT_LEVELS.map((e) => [e, usdToCredits(EFFORT_PRESETS[e].capUsd)])
  ) as Record<Effort, number>;
}

/** Balance is derived, never stored: the ledger is the source of truth. */
export async function getBalance(userId: string): Promise<number> {
  const [row] = await db
    .select({ balance: sql<number>`coalesce(sum(${creditsLedger.delta}), 0)::int` })
    .from(creditsLedger)
    .where(eq(creditsLedger.userId, userId));

  return row?.balance ?? 0;
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
