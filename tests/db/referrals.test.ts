import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { creditsLedger, users } from "@/lib/db/schema";

import { type TestDb, createTestDb, resetDb, seedUser } from "./harness";

/**
 * The referral payout is enforced by the same Postgres guarantees the credits
 * ledger relies on — a unique `payment_ref` for idempotency and a `for update`
 * lock for the cap — so, like the credits tests, these run against a real
 * Postgres (PGlite) rather than a mock.
 */

const dbPromise = createTestDb();
vi.mock("@/lib/db/index", async () => ({ db: await dbPromise }));

const {
  REFEREE_BONUS_CREDITS,
  REFERRER_REWARD_CREDITS,
  REFERRAL_REWARD_CAP,
  getOrCreateReferralCode,
  getReferralStats,
  processReferralReward,
  resolveReferrerByCode,
} = await import("@/lib/referrals");
const { getBalance } = await import("@/lib/credits");

let db: TestDb;

beforeAll(async () => {
  db = await dbPromise;
});

afterEach(async () => {
  await resetDb(db);
});

/** Simulates the webhook's purchase grant: a positive ledger row with a payment ref. */
async function recordPurchase(userId: string, paymentRef: string, credits = 100): Promise<void> {
  await db
    .insert(creditsLedger)
    .values({ userId, delta: credits, reason: "purchase:starter", paymentRef });
}

describe("getOrCreateReferralCode", () => {
  it("generates a code and persists it on the user", async () => {
    const userId = await seedUser(db);

    const code = await getOrCreateReferralCode(userId);
    expect(code).toMatch(/^[a-z2-9]{8}$/);

    const [row] = await db.select({ code: users.referralCode }).from(users);
    expect(row.code).toBe(code);
  });

  it("returns the same code on repeat calls", async () => {
    const userId = await seedUser(db);

    const first = await getOrCreateReferralCode(userId);
    const second = await getOrCreateReferralCode(userId);
    expect(second).toBe(first);
  });

  it("gives different users different codes", async () => {
    const alice = await seedUser(db);
    const bob = await seedUser(db);

    expect(await getOrCreateReferralCode(alice)).not.toBe(await getOrCreateReferralCode(bob));
  });
});

describe("resolveReferrerByCode", () => {
  it("maps a code back to its owner", async () => {
    const userId = await seedUser(db);
    const code = await getOrCreateReferralCode(userId);

    await expect(resolveReferrerByCode(code)).resolves.toBe(userId);
  });

  it("returns null for an unknown code", async () => {
    await expect(resolveReferrerByCode("nope0000")).resolves.toBeNull();
  });
});

describe("processReferralReward", () => {
  it("pays both sides on the referred user's first purchase", async () => {
    const referrer = await seedUser(db);
    const referred = await seedUser(db, { referredBy: referrer });

    await recordPurchase(referred, "pay_1");
    await processReferralReward(referred);

    await expect(getBalance(referrer)).resolves.toBe(REFERRER_REWARD_CREDITS);
    // Referred user: their 100-credit purchase plus the 50-credit bonus.
    await expect(getBalance(referred)).resolves.toBe(100 + REFEREE_BONUS_CREDITS);

    const stats = await getReferralStats(referrer);
    expect(stats).toEqual({ convertedCount: 1, creditsEarned: REFERRER_REWARD_CREDITS });
  });

  it("does nothing when the buyer was not referred", async () => {
    const buyer = await seedUser(db);

    await recordPurchase(buyer, "pay_1");
    await processReferralReward(buyer);

    await expect(getBalance(buyer)).resolves.toBe(100);
  });

  it("pays out only on the first purchase, not later ones", async () => {
    const referrer = await seedUser(db);
    const referred = await seedUser(db, { referredBy: referrer });

    await recordPurchase(referred, "pay_1");
    await processReferralReward(referred);

    await recordPurchase(referred, "pay_2");
    await processReferralReward(referred);

    // Still exactly one reward and one bonus, despite two purchases.
    await expect(getBalance(referrer)).resolves.toBe(REFERRER_REWARD_CREDITS);
    const stats = await getReferralStats(referrer);
    expect(stats.convertedCount).toBe(1);
  });

  it("is idempotent when the same first purchase is processed twice", async () => {
    const referrer = await seedUser(db);
    const referred = await seedUser(db, { referredBy: referrer });

    await recordPurchase(referred, "pay_1");
    await processReferralReward(referred);
    await processReferralReward(referred);

    await expect(getBalance(referrer)).resolves.toBe(REFERRER_REWARD_CREDITS);
    await expect(getBalance(referred)).resolves.toBe(100 + REFEREE_BONUS_CREDITS);
  });

  it("stops rewarding the referrer once the cap is reached", async () => {
    const referrer = await seedUser(db);

    // One more converted referral than the cap allows.
    for (let i = 0; i < REFERRAL_REWARD_CAP + 1; i++) {
      const referred = await seedUser(db, { referredBy: referrer });
      await recordPurchase(referred, `pay_${i}`);
      await processReferralReward(referred);
    }

    const stats = await getReferralStats(referrer);
    expect(stats.convertedCount).toBe(REFERRAL_REWARD_CAP);
    await expect(getBalance(referrer)).resolves.toBe(REFERRAL_REWARD_CAP * REFERRER_REWARD_CREDITS);
  });

  it("still gives the referee their bonus even after the referrer is capped", async () => {
    const referrer = await seedUser(db);

    for (let i = 0; i < REFERRAL_REWARD_CAP; i++) {
      const capped = await seedUser(db, { referredBy: referrer });
      await recordPurchase(capped, `cap_${i}`);
      await processReferralReward(capped);
    }

    // One referral beyond the cap: the referrer earns nothing more, but this
    // referred user should still receive their signup bonus.
    const referred = await seedUser(db, { referredBy: referrer });
    await recordPurchase(referred, "over_cap");
    await processReferralReward(referred);

    await expect(getBalance(referrer)).resolves.toBe(REFERRAL_REWARD_CAP * REFERRER_REWARD_CREDITS);
    await expect(getBalance(referred)).resolves.toBe(100 + REFEREE_BONUS_CREDITS);
  });
});

describe("getReferralStats", () => {
  it("reports zero for a user with no referrals", async () => {
    const userId = await seedUser(db);
    await expect(getReferralStats(userId)).resolves.toEqual({
      convertedCount: 0,
      creditsEarned: 0,
    });
  });
});
