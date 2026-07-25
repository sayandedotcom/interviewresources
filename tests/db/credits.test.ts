import { eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { creditsLedger, paymentRefunds, payments, researches, users } from "@/lib/db/schema";

import { type TestDb, createTestDb, resetDb, seedUser } from "./harness";

/**
 * The ledger functions are the only place credits are created or destroyed, and
 * every guarantee they make — idempotent grants, a balance that is always
 * SUM(delta) — is enforced by Postgres, not by TypeScript. Mocking the database
 * here would test nothing, so these run against a real Postgres (PGlite).
 */

const dbPromise = createTestDb();
vi.mock("@/lib/db/index", async () => ({ db: await dbPromise }));

const {
  chargeCredits,
  getBalance,
  grantCredits,
  isPaymentCredited,
  reapStaleCreditReservations,
  releaseCreditReservation,
  reserveCredits,
  reverseRefund,
  settleCreditReservation,
  settlePayment,
} = await import("@/lib/credits");

let db: TestDb;

beforeAll(async () => {
  db = await dbPromise;
});

afterEach(async () => {
  await resetDb(db);
});

describe("getBalance", () => {
  it("returns zero for a user with no ledger rows", async () => {
    const userId = await seedUser(db);
    await expect(getBalance(userId)).resolves.toBe(0);
  });

  it("returns zero for a user that does not exist", async () => {
    await expect(getBalance("00000000-0000-0000-0000-000000000000")).resolves.toBe(0);
  });

  it("sums grants and charges", async () => {
    const userId = await seedUser(db);
    await db.insert(creditsLedger).values([
      { userId, delta: 500, reason: "purchase:pro", paymentRef: "pay_1" },
      { userId, delta: -46, reason: "research" },
      { userId, delta: -13, reason: "research" },
    ]);

    await expect(getBalance(userId)).resolves.toBe(441);
  });

  it("returns an integer, not a Postgres bigint string", async () => {
    const userId = await seedUser(db);
    await db.insert(creditsLedger).values({ userId, delta: 100, reason: "p", paymentRef: "p1" });

    const balance = await getBalance(userId);
    expect(balance).toBe(100);
    expect(typeof balance).toBe("number");
  });

  it("never mixes one user's ledger into another's balance", async () => {
    const alice = await seedUser(db);
    const bob = await seedUser(db);
    await db.insert(creditsLedger).values([
      { userId: alice, delta: 500, reason: "p", paymentRef: "pay_a" },
      { userId: bob, delta: 100, reason: "p", paymentRef: "pay_b" },
    ]);

    await expect(getBalance(alice)).resolves.toBe(500);
    await expect(getBalance(bob)).resolves.toBe(100);
  });

  it("can go negative, which is what blocks the next run", async () => {
    const userId = await seedUser(db);
    await db.insert(creditsLedger).values([
      { userId, delta: 50, reason: "p", paymentRef: "pay_1" },
      { userId, delta: -60, reason: "research" },
    ]);

    await expect(getBalance(userId)).resolves.toBe(-10);
  });
});

describe("grantCredits", () => {
  it("grants credits and reports that it did", async () => {
    const userId = await seedUser(db);

    await expect(
      grantCredits({ userId, credits: 500, reason: "purchase:pro", paymentRef: "pay_1" })
    ).resolves.toBe(true);
    await expect(getBalance(userId)).resolves.toBe(500);
  });

  it("is idempotent: a redelivered webhook does not double-grant", async () => {
    const userId = await seedUser(db);
    const grant = { userId, credits: 500, reason: "purchase:pro", paymentRef: "pay_1" };

    await expect(grantCredits(grant)).resolves.toBe(true);
    await expect(grantCredits(grant)).resolves.toBe(false);
    await expect(grantCredits(grant)).resolves.toBe(false);

    await expect(getBalance(userId)).resolves.toBe(500);
  });

  it("rejects a replayed payment id even for a different user or amount", async () => {
    const alice = await seedUser(db);
    const bob = await seedUser(db);

    await grantCredits({ userId: alice, credits: 100, reason: "p", paymentRef: "pay_dup" });
    const second = await grantCredits({
      userId: bob,
      credits: 99_999,
      reason: "p",
      paymentRef: "pay_dup",
    });

    expect(second).toBe(false);
    await expect(getBalance(bob)).resolves.toBe(0);
  });

  it("survives concurrent redeliveries of the same payment", async () => {
    const userId = await seedUser(db);
    const grant = { userId, credits: 100, reason: "p", paymentRef: "pay_race" };

    const results = await Promise.all([
      grantCredits(grant),
      grantCredits(grant).catch(() => false),
      grantCredits(grant).catch(() => false),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    await expect(getBalance(userId)).resolves.toBe(100);
  });

  it("lets distinct payments both land", async () => {
    const userId = await seedUser(db);

    await grantCredits({ userId, credits: 100, reason: "p", paymentRef: "pay_1" });
    await grantCredits({ userId, credits: 500, reason: "p", paymentRef: "pay_2" });

    await expect(getBalance(userId)).resolves.toBe(600);
  });

  it("refuses a grant for a user that does not exist", async () => {
    await expect(
      grantCredits({
        userId: "00000000-0000-0000-0000-000000000000",
        credits: 100,
        reason: "p",
        paymentRef: "pay_x",
      })
    ).rejects.toThrow();
  });
});

describe("chargeCredits", () => {
  it("writes a negative delta and returns the new balance", async () => {
    const userId = await seedUser(db);
    await grantCredits({ userId, credits: 500, reason: "p", paymentRef: "pay_1" });

    await expect(chargeCredits({ userId, credits: 46, reason: "research" })).resolves.toEqual({
      balanceAfter: 454,
    });
  });

  it("links the charge to the research that caused it", async () => {
    const userId = await seedUser(db);
    await grantCredits({ userId, credits: 500, reason: "p", paymentRef: "pay_1" });
    const [research] = await db
      .insert(researches)
      .values({ userId, companyName: "Stripe", interviewType: "dsa", status: "done" })
      .returning({ id: researches.id });

    await chargeCredits({ userId, credits: 46, reason: "research", researchId: research.id });

    const rows = await db.select().from(creditsLedger);
    const charge = rows.find((r) => r.delta < 0)!;
    expect(charge.researchId).toBe(research.id);
    expect(charge.paymentRef).toBeNull();
  });

  it("allows many charges with a null paymentRef, so the unique index must ignore nulls", async () => {
    const userId = await seedUser(db);
    await grantCredits({ userId, credits: 500, reason: "p", paymentRef: "pay_1" });

    await chargeCredits({ userId, credits: 10, reason: "research" });
    await chargeCredits({ userId, credits: 10, reason: "research" });
    await chargeCredits({ userId, credits: 10, reason: "research" });

    await expect(getBalance(userId)).resolves.toBe(470);
  });

  it("refuses to create a negative balance", async () => {
    const userId = await seedUser(db);
    await grantCredits({ userId, credits: 50, reason: "p", paymentRef: "pay_1" });

    await expect(chargeCredits({ userId, credits: 130, reason: "research" })).rejects.toThrow(
      "insufficient credits"
    );
    await expect(getBalance(userId)).resolves.toBe(50);
  });

  it("charges nothing for a zero-cost run without corrupting the balance", async () => {
    const userId = await seedUser(db);
    await grantCredits({ userId, credits: 100, reason: "p", paymentRef: "pay_1" });

    await expect(chargeCredits({ userId, credits: 0, reason: "research" })).resolves.toEqual({
      balanceAfter: 100,
    });
  });

  it("keeps the ledger append-only: charging never mutates the grant row", async () => {
    const userId = await seedUser(db);
    await grantCredits({ userId, credits: 500, reason: "p", paymentRef: "pay_1" });
    await chargeCredits({ userId, credits: 46, reason: "research" });

    const rows = await db.select().from(creditsLedger);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.paymentRef === "pay_1")!.delta).toBe(500);
  });

  it("does not touch another user's balance", async () => {
    const alice = await seedUser(db);
    const bob = await seedUser(db);
    await grantCredits({ userId: alice, credits: 500, reason: "p", paymentRef: "pay_a" });
    await grantCredits({ userId: bob, credits: 500, reason: "p", paymentRef: "pay_b" });

    await chargeCredits({ userId: alice, credits: 100, reason: "research" });

    await expect(getBalance(bob)).resolves.toBe(500);
  });

  it("rolls the whole charge back when the transaction fails", async () => {
    const userId = await seedUser(db);
    await grantCredits({ userId, credits: 500, reason: "p", paymentRef: "pay_1" });

    // A researchId that violates the foreign key aborts the inserting transaction.
    await expect(
      chargeCredits({
        userId,
        credits: 46,
        reason: "research",
        researchId: "00000000-0000-0000-0000-000000000000",
      })
    ).rejects.toThrow();

    await expect(getBalance(userId)).resolves.toBe(500);
  });
});

describe("credit reservations", () => {
  it("authorizes at most the available balance across concurrent work", async () => {
    const userId = await seedUser(db);
    await grantCredits({ userId, credits: 100, reason: "p", paymentRef: "pay_1" });

    const results = await Promise.all([
      reserveCredits({
        userId,
        minimumCredits: 50,
        maximumCredits: 80,
        reference: "run_a",
        reason: "research",
      }),
      reserveCredits({
        userId,
        minimumCredits: 50,
        maximumCredits: 80,
        reference: "run_b",
        reason: "research",
      }),
    ]);

    expect(results.filter((result) => result.status === "reserved")).toHaveLength(1);
    expect(results.filter((result) => result.status === "insufficient_credits")).toHaveLength(1);
    await expect(getBalance(userId)).resolves.toBe(20);
  });

  it("returns unused credits when the metered charge settles", async () => {
    const userId = await seedUser(db);
    await grantCredits({ userId, credits: 100, reason: "p", paymentRef: "pay_1" });
    await reserveCredits({
      userId,
      minimumCredits: 50,
      maximumCredits: 80,
      reference: "run_1",
      reason: "research",
    });

    await expect(
      settleCreditReservation({
        userId,
        reference: "run_1",
        actualCredits: 30,
        reason: "research",
      })
    ).resolves.toEqual({ balanceAfter: 70, reservedCredits: 80 });
    await expect(getBalance(userId)).resolves.toBe(70);
  });

  it("releases the full reservation after failed provider work", async () => {
    const userId = await seedUser(db);
    await grantCredits({ userId, credits: 100, reason: "p", paymentRef: "pay_1" });
    await reserveCredits({
      userId,
      minimumCredits: 50,
      maximumCredits: 80,
      reference: "run_1",
      reason: "research",
    });

    await releaseCreditReservation({
      userId,
      reference: "run_1",
      reason: "research_failed:release",
    });

    await expect(getBalance(userId)).resolves.toBe(100);
  });

  it("never settles more credits than were reserved", async () => {
    const userId = await seedUser(db);
    await grantCredits({ userId, credits: 100, reason: "p", paymentRef: "pay_1" });
    await reserveCredits({
      userId,
      minimumCredits: 50,
      maximumCredits: 80,
      reference: "run_1",
      reason: "research",
    });

    await expect(
      settleCreditReservation({
        userId,
        reference: "run_1",
        actualCredits: 81,
        reason: "research",
      })
    ).rejects.toThrow("exceeds reserved credits");
    await expect(getBalance(userId)).resolves.toBe(20);
  });

  it("releases stale reservations once without touching fresh ones", async () => {
    const userId = await seedUser(db);
    await grantCredits({ userId, credits: 200, reason: "p", paymentRef: "pay_1" });
    await reserveCredits({
      userId,
      minimumCredits: 50,
      maximumCredits: 80,
      reference: "stale",
      reason: "research",
    });
    await reserveCredits({
      userId,
      minimumCredits: 50,
      maximumCredits: 80,
      reference: "fresh",
      reason: "research",
    });
    await db
      .update(creditsLedger)
      .set({ createdAt: new Date("2026-01-01T00:00:00Z") })
      .where(eq(creditsLedger.paymentRef, "reservation:stale"));

    await expect(reapStaleCreditReservations(new Date("2026-01-02T00:00:00Z"))).resolves.toBe(1);
    await expect(reapStaleCreditReservations(new Date("2026-01-02T00:00:00Z"))).resolves.toBe(0);
    await expect(getBalance(userId)).resolves.toBe(120);
  });
});

describe("the ledger as the source of truth", () => {
  it("stores no balance column on users — it is always derived", async () => {
    const userId = await seedUser(db);
    const [row] = await db.select().from(users);

    expect(row.id).toBe(userId);
    expect(row).not.toHaveProperty("balance");
    expect(row).not.toHaveProperty("credits");
  });

  it("replaying the whole ledger reproduces the balance exactly", async () => {
    const userId = await seedUser(db);
    await grantCredits({ userId, credits: 500, reason: "p", paymentRef: "pay_1" });
    await chargeCredits({ userId, credits: 46, reason: "research" });
    await chargeCredits({ userId, credits: 13, reason: "research" });
    await grantCredits({ userId, credits: 100, reason: "p", paymentRef: "pay_2" });

    const rows = await db.select().from(creditsLedger);
    const replayed = rows.reduce((sum, r) => sum + r.delta, 0);

    await expect(getBalance(userId)).resolves.toBe(replayed);
    expect(replayed).toBe(541);
  });
});

/**
 * Backs the success page. It must answer for one payment on one account, so a
 * returning customer's existing credits cannot be mistaken for a fresh grant.
 */
describe("isPaymentCredited", () => {
  it("is false before the webhook lands", async () => {
    const userId = await seedUser(db);
    await expect(isPaymentCredited(userId, "pay_1")).resolves.toBe(false);
  });

  it("is true once that payment has been granted", async () => {
    const userId = await seedUser(db);
    await grantCredits({ userId, credits: 100, reason: "purchase:starter", paymentRef: "pay_1" });

    await expect(isPaymentCredited(userId, "pay_1")).resolves.toBe(true);
  });

  it("stays false for a different payment on an account that already has credits", async () => {
    const userId = await seedUser(db);
    await grantCredits({ userId, credits: 420, reason: "purchase:max", paymentRef: "pay_old" });

    await expect(isPaymentCredited(userId, "pay_new")).resolves.toBe(false);
  });

  it("does not report another user's payment as credited", async () => {
    const alice = await seedUser(db);
    const bob = await seedUser(db);
    await grantCredits({ userId: alice, credits: 100, reason: "purchase", paymentRef: "pay_1" });

    await expect(isPaymentCredited(bob, "pay_1")).resolves.toBe(false);
  });
});

describe("provider payment accounting", () => {
  it("stores actual cash facts and the credit grant in one idempotent transaction", async () => {
    const userId = await seedUser(db);
    const payment = {
      userId,
      credits: 550,
      reason: "purchase:bundle",
      paymentRef: "pay_bundle",
      amountMinor: 649,
      currency: "usd",
      pack: "bundle",
    };

    await expect(settlePayment(payment)).resolves.toBe(true);
    await expect(settlePayment(payment)).resolves.toBe(false);

    await expect(getBalance(userId)).resolves.toBe(550);
    await expect(db.select().from(payments)).resolves.toMatchObject([
      {
        providerPaymentId: "pay_bundle",
        amountMinor: 649,
        currency: "USD",
        pack: "bundle",
        catalogPriceUsdMinor: 649,
        creditsGranted: 550,
        estimatedDodoFeeMicros: 659_600,
        economicsVersion: "2026-07-26.v1",
      },
    ]);
  });

  it("applies partial refunds once and cumulatively reverses the granted credits", async () => {
    const userId = await seedUser(db);
    await settlePayment({
      userId,
      credits: 100,
      reason: "purchase:starter",
      paymentRef: "pay_1",
      amountMinor: 149,
      currency: "USD",
      pack: "starter",
    });

    await expect(
      reverseRefund({
        paymentRef: "pay_1",
        refundRef: "refund_25",
        amountMinor: 37,
        currency: "USD",
      })
    ).resolves.toBe(true);
    await expect(
      reverseRefund({
        paymentRef: "pay_1",
        refundRef: "refund_25",
        amountMinor: 37,
        currency: "USD",
      })
    ).resolves.toBe(false);
    await expect(getBalance(userId)).resolves.toBe(75);

    await expect(
      reverseRefund({
        paymentRef: "pay_1",
        refundRef: "refund_rest",
        amountMinor: 112,
        currency: "USD",
      })
    ).resolves.toBe(true);
    await expect(getBalance(userId)).resolves.toBe(0);

    const [payment] = await db.select().from(payments);
    expect(payment).toMatchObject({
      status: "refunded",
      refundedAmountMinor: 149,
      creditsReversed: 100,
    });
    expect(await db.select().from(paymentRefunds)).toHaveLength(2);
  });
});
