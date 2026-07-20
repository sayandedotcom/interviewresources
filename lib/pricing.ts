/**
 * The pure credit math: dollars ↔ credits, and the per-effort ceilings.
 *
 * Split out of lib/credits.ts (which owns the ledger, and therefore the db
 * connection) so client components can price a run without pulling postgres
 * into the browser bundle. lib/credits.ts re-exports all of this, so server
 * code can keep importing from the one place.
 */
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
 * Extensions ("more questions", "gather another round") reuse the same pipeline
 * but produce a fraction of a full report, so they get a smaller floor and a
 * tighter dollar cap than a fresh run: half the same effort's full-run cap.
 * Medium works out to $0.5, the flat value extensions used before they were
 * effort-aware.
 */
export const MIN_EXTEND_CREDITS = 25;

export function extendCapUsd(effort: Effort): number {
  return EFFORT_PRESETS[effort].capUsd / 2;
}

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

/** Credit ceiling per effort for an extension — mirror of effortCredits(). */
export function extendCredits(): Record<Effort, number> {
  return Object.fromEntries(EFFORT_LEVELS.map((e) => [e, usdToCredits(extendCapUsd(e))])) as Record<
    Effort,
    number
  >;
}
