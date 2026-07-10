import { and, eq, isNull, sql } from "drizzle-orm";
import { randomInt } from "node:crypto";

import { grantCredits } from "./credits";
import { db } from "./db/index";
import { creditsLedger, users } from "./db/schema";

/** Credits the referrer earns when someone they referred makes a first purchase. */
export const REFERRER_REWARD_CREDITS = 100;

/** Bonus the referred user earns on that same first purchase. */
export const REFEREE_BONUS_CREDITS = 50;

/**
 * The most referrals one account can be paid for. Caps the blast radius of a
 * user farming rewards with throwaway Google accounts and $1 starter packs:
 * even fully abused, the ceiling is 10 × 100 = 1,000 credits ($10 of value).
 */
export const REFERRAL_REWARD_CAP = 10;

/**
 * base32-ish, minus the characters people misread (0/o, 1/l/i). An 8-char code
 * from this 31-letter alphabet is ~31^8 ≈ 8.5e11 possibilities, so collisions
 * are vanishingly rare and the retry loop below is a formality, not a hot path.
 */
const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const CODE_LENGTH = 8;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Returns the user's referral code, generating and persisting one on first call.
 * Generation is lazy so a user who never opens the referrals page never gets a
 * code. Safe under a race: the `is null` guard means only the first writer wins,
 * and a loser re-reads the winner's code instead of overwriting it.
 */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const [existing] = await db
    .select({ code: users.referralCode })
    .from(users)
    .where(eq(users.id, userId));

  if (existing?.code) return existing.code;

  // A handful of attempts is far more than the birthday math ever needs; the
  // loop only guards against the astronomically unlikely code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    try {
      const updated = await db
        .update(users)
        .set({ referralCode: code })
        .where(and(eq(users.id, userId), isNull(users.referralCode)))
        .returning({ code: users.referralCode });

      if (updated.length > 0 && updated[0].code) return updated[0].code;

      // Zero rows updated means a concurrent call already set the code.
      const [row] = await db
        .select({ code: users.referralCode })
        .from(users)
        .where(eq(users.id, userId));
      if (row?.code) return row.code;
    } catch {
      // Unique-constraint collision on the generated code — try another.
    }
  }

  throw new Error(`could not allocate a referral code for user ${userId}`);
}

/** Resolves a share code back to the referrer's user id, or null if unknown. */
export async function resolveReferrerByCode(code: string): Promise<string | null> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.referralCode, code))
    .limit(1);
  return row?.id ?? null;
}

export interface ReferralStats {
  /** How many referred users have converted (i.e. earned this user a reward). */
  convertedCount: number;
  /** Total credits this user has earned from referrals. */
  creditsEarned: number;
}

/** Referral standing, derived entirely from the reward rows in the ledger. */
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const [row] = await db
    .select({
      convertedCount: sql<number>`count(*)::int`,
      creditsEarned: sql<number>`coalesce(sum(${creditsLedger.delta}), 0)::int`,
    })
    .from(creditsLedger)
    .where(and(eq(creditsLedger.userId, userId), eq(creditsLedger.reason, "referral_reward")));

  return {
    convertedCount: row?.convertedCount ?? 0,
    creditsEarned: row?.creditsEarned ?? 0,
  };
}

/**
 * Pays out a referral when the referred user makes their FIRST purchase. Call
 * this from the payment webhook right after the purchase grant lands.
 *
 * It is safe to call more than once for the same purchase: both grants are keyed
 * on the buyer's id via `paymentRef`, so a redelivered webhook can never
 * double-pay. Any failure here is swallowed by the caller — a referral must
 * never roll back the purchase the customer actually paid for.
 */
export async function processReferralReward(buyerId: string): Promise<void> {
  const [buyer] = await db
    .select({ referredBy: users.referredBy })
    .from(users)
    .where(eq(users.id, buyerId));

  const referrerId = buyer?.referredBy;
  if (!referrerId) return;

  // First-purchase gate: exactly one purchase row means the one just inserted by
  // the webhook is the buyer's first, so this payout fires once per referral.
  const [purchases] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(creditsLedger)
    .where(and(eq(creditsLedger.userId, buyerId), sql`${creditsLedger.reason} like 'purchase:%'`));

  if ((purchases?.count ?? 0) !== 1) return;

  // The referrer reward is capped. Take a row lock on the referrer so two of
  // their referees converting at the same instant can't both slip past the cap.
  await db.transaction(async (tx) => {
    await tx.execute(sql`select id from ${users} where ${users.id} = ${referrerId} for update`);

    const [rewarded] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(creditsLedger)
      .where(
        and(eq(creditsLedger.userId, referrerId), eq(creditsLedger.reason, "referral_reward"))
      );

    if ((rewarded?.count ?? 0) < REFERRAL_REWARD_CAP) {
      await tx
        .insert(creditsLedger)
        .values({
          userId: referrerId,
          delta: REFERRER_REWARD_CREDITS,
          reason: "referral_reward",
          paymentRef: `referral:${buyerId}`,
        })
        .onConflictDoNothing({ target: creditsLedger.paymentRef });
    }
  });

  // The referee's bonus is uncapped and independent of the referrer's ceiling:
  // even a referrer who has maxed out their rewards still gives their friends
  // the signup bonus. Idempotent via its own paymentRef.
  await grantCredits({
    userId: buyerId,
    credits: REFEREE_BONUS_CREDITS,
    reason: "referral_bonus",
    paymentRef: `referral-bonus:${buyerId}`,
  });
}
