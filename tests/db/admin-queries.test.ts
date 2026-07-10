import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { creditsLedger, researches } from "@/lib/db/schema";

import { type TestDb, createTestDb, resetDb, seedUser } from "./harness";

/**
 * The admin dashboard's whole value is reading real margin and health signals
 * out of the researches/credits_ledger tables, so these aggregates need to run
 * against a real Postgres (PGlite) rather than a mocked query builder.
 */

const dbPromise = createTestDb();
vi.mock("@/lib/db/index", async () => ({ db: await dbPromise }));

const {
  getUnitEconomics,
  getUnpaidCost,
  getRunsByDay,
  getStuckRuns,
  getTopCompanies,
  getPurchases,
  getUserGrowth,
  getNegativeBalances,
} = await import("@/lib/admin/queries");

let db: TestDb;

beforeAll(async () => {
  db = await dbPromise;
});

afterEach(async () => {
  await resetDb(db);
});

describe("getUnitEconomics", () => {
  it("splits revenue (billed) from cost (metered) for a done run", async () => {
    const userId = await seedUser(db);
    await db.insert(researches).values({
      userId,
      companyName: "Stripe",
      interviewType: "dsa",
      status: "done",
      costCentsLlm: 20,
      costCentsSearch: 4,
      creditsCharged: 46,
    });

    const [day] = await getUnitEconomics(30);

    expect(day.revenueUsd).toBeCloseTo(0.46, 5);
    expect(day.costUsd).toBeCloseTo(0.24, 5);
  });

  it("still counts a failed run's cost even though it was never billed", async () => {
    const userId = await seedUser(db);
    await db.insert(researches).values({
      userId,
      companyName: "Stripe",
      interviewType: "dsa",
      status: "failed",
      costCentsLlm: 20,
      costCentsSearch: 4,
      creditsCharged: null,
    });

    const [day] = await getUnitEconomics(30);

    expect(day.revenueUsd).toBe(0);
    expect(day.costUsd).toBeCloseTo(0.24, 5);
  });

  it("excludes runs outside the requested window", async () => {
    const userId = await seedUser(db);
    await db.insert(researches).values({
      userId,
      companyName: "Old Co",
      interviewType: "dsa",
      status: "done",
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      costCentsLlm: 100,
      creditsCharged: 100,
    });

    expect(await getUnitEconomics(30)).toEqual([]);
  });
});

describe("getUnpaidCost", () => {
  it("sums cost only for runs with no credits charged", async () => {
    const userId = await seedUser(db);
    await db.insert(researches).values([
      {
        userId,
        companyName: "Stripe",
        interviewType: "dsa",
        status: "failed",
        costCentsLlm: 20,
        costCentsSearch: 4,
        creditsCharged: null,
      },
      {
        userId,
        companyName: "Stripe",
        interviewType: "dsa",
        status: "done",
        costCentsLlm: 20,
        costCentsSearch: 4,
        creditsCharged: 46,
      },
    ]);

    const result = await getUnpaidCost(30);

    expect(result.runs).toBe(1);
    expect(result.costUsd).toBeCloseTo(0.24, 5);
  });

  it("returns zero for a window with no unpaid runs", async () => {
    await expect(getUnpaidCost(30)).resolves.toEqual({ runs: 0, costUsd: 0 });
  });
});

describe("getRunsByDay", () => {
  it("groups runs by day and status", async () => {
    const userId = await seedUser(db);
    await db.insert(researches).values([
      { userId, companyName: "A", interviewType: "dsa", status: "done" },
      { userId, companyName: "B", interviewType: "dsa", status: "done" },
      { userId, companyName: "C", interviewType: "dsa", status: "failed" },
    ]);

    const rows = await getRunsByDay(30);
    const done = rows.find((r) => r.status === "done");
    const failed = rows.find((r) => r.status === "failed");

    expect(done?.runs).toBe(2);
    expect(failed?.runs).toBe(1);
  });
});

describe("getStuckRuns", () => {
  it("flags a run stuck in 'running' past the cutoff", async () => {
    const userId = await seedUser(db);
    await db.insert(researches).values({
      userId,
      companyName: "Stuck Co",
      interviewType: "dsa",
      status: "running",
      createdAt: new Date(Date.now() - 20 * 60 * 1000),
    });

    const stuck = await getStuckRuns();

    expect(stuck).toHaveLength(1);
    expect(stuck[0].companyName).toBe("Stuck Co");
  });

  it("ignores a run that is still fresh", async () => {
    const userId = await seedUser(db);
    await db.insert(researches).values({
      userId,
      companyName: "Fresh Co",
      interviewType: "dsa",
      status: "running",
      createdAt: new Date(),
    });

    expect(await getStuckRuns()).toEqual([]);
  });

  it("ignores a run that finished", async () => {
    const userId = await seedUser(db);
    await db.insert(researches).values({
      userId,
      companyName: "Done Co",
      interviewType: "dsa",
      status: "done",
      createdAt: new Date(Date.now() - 20 * 60 * 1000),
    });

    expect(await getStuckRuns()).toEqual([]);
  });
});

describe("getTopCompanies", () => {
  it("ranks companies by run count", async () => {
    const userId = await seedUser(db);
    await db.insert(researches).values([
      { userId, companyName: "Stripe", interviewType: "dsa", status: "done" },
      { userId, companyName: "Stripe", interviewType: "dsa", status: "done" },
      { userId, companyName: "Airbnb", interviewType: "dsa", status: "done" },
    ]);

    const [top] = await getTopCompanies(5);

    expect(top.companyName).toBe("Stripe");
    expect(top.runs).toBe(2);
  });
});

describe("getPurchases", () => {
  it("counts only ledger rows tied to a payment", async () => {
    const userId = await seedUser(db);
    await db.insert(creditsLedger).values([
      { userId, delta: 500, reason: "purchase:pro", paymentRef: "pay_1" },
      { userId, delta: -46, reason: "research" },
    ]);

    const [day] = await getPurchases(30);

    expect(day.purchaseUsd).toBeCloseTo(5, 5);
  });
});

describe("getUserGrowth", () => {
  it("counts the day's signups", async () => {
    await seedUser(db);
    await seedUser(db);

    const [day] = await getUserGrowth(30);

    expect(day.signups).toBe(2);
  });
});

describe("getNegativeBalances", () => {
  it("catches a user charged past zero", async () => {
    const userId = await seedUser(db, { email: "eve@example.com" });
    await db.insert(creditsLedger).values([
      { userId, delta: 50, reason: "p", paymentRef: "pay_1" },
      { userId, delta: -60, reason: "research" },
    ]);

    const negative = await getNegativeBalances();

    expect(negative).toHaveLength(1);
    expect(negative[0]).toMatchObject({ userId, email: "eve@example.com", balance: -10 });
  });

  it("ignores a user with a healthy balance", async () => {
    const userId = await seedUser(db);
    await db.insert(creditsLedger).values({ userId, delta: 50, reason: "p", paymentRef: "pay_1" });

    expect(await getNegativeBalances()).toEqual([]);
  });
});
