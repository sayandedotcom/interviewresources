import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { creditsLedger, researches, users } from "@/lib/db/schema";

import { type TestDb, createTestDb, resetDb, seedUser } from "./harness";

/**
 * The ledger functions are the only place credits are created or destroyed, and
 * every guarantee they make — idempotent grants, a balance that is always
 * SUM(delta) — is enforced by Postgres, not by TypeScript. Mocking the database
 * here would test nothing, so these run against a real Postgres (PGlite).
 */

const dbPromise = createTestDb();
vi.mock("@/lib/db/index", async () => ({ db: await dbPromise }));

const { chargeCredits, getBalance, grantCredits } = await import("@/lib/credits");

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

  it("charges unconditionally — the API spend is already sunk, so the balance may go negative", async () => {
    const userId = await seedUser(db);
    await grantCredits({ userId, credits: 50, reason: "p", paymentRef: "pay_1" });

    await expect(chargeCredits({ userId, credits: 130, reason: "research" })).resolves.toEqual({
      balanceAfter: -80,
    });
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
