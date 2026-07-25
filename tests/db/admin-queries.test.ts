import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  creditsLedger,
  paymentDisputes,
  paymentRefunds,
  payments,
  researches,
} from "@/lib/db/schema";

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
  getContributionEconomics,
  getEconomicsAlerts,
  getOutstandingCreditLiability,
  getPackMargins,
  getUnpaidCost,
  getRunsByDay,
  getStuckRuns,
  getTopCompanies,
  getPurchases,
  getUserGrowth,
  getNegativeBalances,
  getCostPercentiles,
} = await import("@/lib/admin/queries");

let db: TestDb;

beforeAll(async () => {
  db = await dbPromise;
});

afterEach(async () => {
  await resetDb(db);
});

describe("getUnitEconomics", () => {
  it("splits actual receipts from metered API COGS for a done run", async () => {
    const userId = await seedUser(db);
    await db.insert(payments).values({
      userId,
      providerPaymentId: "pay_1",
      amountMinor: 149,
      currency: "USD",
      pack: "starter",
      catalogPriceUsdMinor: 149,
      creditsGranted: 100,
      estimatedDodoFeeMicros: 459_600,
      economicsVersion: "test",
    });
    await db.insert(researches).values({
      userId,
      companyName: "Stripe",
      interviewType: "dsa",
      status: "done",
      costMicrosLlm: 200_000,
      costMicrosSearch: 40_000,
      creditsCharged: 46,
    });

    const [day] = await getUnitEconomics(30);

    expect(day.grossSalesUsd).toBeCloseTo(1.49, 5);
    expect(day.netReceiptsUsd).toBeCloseTo(1.0304, 5);
    expect(day.apiCogsUsd).toBeCloseTo(0.24, 5);
    expect(day.contributionUsd).toBeCloseTo(0.7904, 5);
  });

  it("still counts a failed run's cost even though it was never billed", async () => {
    const userId = await seedUser(db);
    await db.insert(researches).values({
      userId,
      companyName: "Stripe",
      interviewType: "dsa",
      status: "failed",
      costMicrosLlm: 200_000,
      costMicrosSearch: 40_000,
      creditsCharged: null,
    });

    const [day] = await getUnitEconomics(30);

    expect(day.grossSalesUsd).toBe(0);
    expect(day.netReceiptsUsd).toBe(0);
    expect(day.apiCogsUsd).toBeCloseTo(0.24, 5);
    expect(day.contributionUsd).toBeCloseTo(-0.24, 5);
  });

  it("excludes runs outside the requested window", async () => {
    const userId = await seedUser(db);
    await db.insert(researches).values({
      userId,
      companyName: "Old Co",
      interviewType: "dsa",
      status: "done",
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      costMicrosLlm: 1_000_000,
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
        costMicrosLlm: 200_000,
        costMicrosSearch: 40_000,
        creditsCharged: null,
      },
      {
        userId,
        companyName: "Stripe",
        interviewType: "dsa",
        status: "done",
        costMicrosLlm: 200_000,
        costMicrosSearch: 40_000,
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

describe("getContributionEconomics", () => {
  it("includes refunds, refund fees, paid COGS, and unpaid failed-run COGS", async () => {
    const userId = await seedUser(db);
    const [payment] = await db
      .insert(payments)
      .values({
        userId,
        providerPaymentId: "pay_bundle",
        amountMinor: 649,
        currency: "USD",
        pack: "bundle",
        catalogPriceUsdMinor: 649,
        creditsGranted: 550,
        estimatedDodoFeeMicros: 659_600,
        economicsVersion: "test",
        refundedAmountMinor: 100,
      })
      .returning({ id: payments.id });
    await db.insert(paymentRefunds).values({
      paymentId: payment.id,
      providerRefundId: "refund_1",
      amountMinor: 100,
      currency: "USD",
      creditsReversed: 85,
      estimatedFeeMicros: 1_000_000,
      economicsVersion: "test",
    });
    await db.insert(researches).values([
      {
        userId,
        companyName: "Paid",
        interviewType: "dsa",
        status: "done",
        costMicrosLlm: 317_000,
        creditsCharged: 42,
      },
      {
        userId,
        companyName: "Failed",
        interviewType: "dsa",
        status: "failed",
        costMicrosLlm: 83_000,
        creditsCharged: null,
      },
    ]);

    const summary = await getContributionEconomics(30);

    expect(summary).toMatchObject({
      grossSalesUsd: 6.49,
      estimatedDodoTransactionFeesUsd: 0.6596,
      refundAmountsUsd: 1,
      refundFeesUsd: 1,
      netReceiptsUsd: 3.8304,
      apiCogsUsd: 0.317,
      unpaidFailedRunCogsUsd: 0.083,
      contributionUsd: 3.4304,
    });
  });

  it("recognizes an open or lost dispute as receipts at risk plus the dispute fee", async () => {
    const userId = await seedUser(db);
    const [payment] = await db
      .insert(payments)
      .values({
        userId,
        providerPaymentId: "pay_max",
        amountMinor: 1_249,
        currency: "USD",
        pack: "max",
        catalogPriceUsdMinor: 1_249,
        creditsGranted: 1_200,
        estimatedDodoFeeMicros: 899_600,
        economicsVersion: "test",
      })
      .returning({ id: payments.id });
    await db.insert(paymentDisputes).values({
      paymentId: payment.id,
      providerDisputeId: "dispute_1",
      amountMinor: 1_249,
      currency: "USD",
      status: "dispute_lost",
      estimatedFeeMicros: 30_000_000,
      economicsVersion: "test",
    });

    const summary = await getContributionEconomics(30);

    expect(summary.disputeAmountsUsd).toBe(12.49);
    expect(summary.disputeFeesUsd).toBe(30);
    expect(summary.netReceiptsUsd).toBeCloseTo(-30.8996, 5);
  });
});

describe("liability and margin controls", () => {
  it("values only positive outstanding balances at replacement cost", async () => {
    const healthy = await seedUser(db);
    const negative = await seedUser(db);
    await db.insert(creditsLedger).values([
      { userId: healthy, delta: 550, reason: "purchase" },
      { userId: negative, delta: -10, reason: "refund" },
    ]);

    await expect(getOutstandingCreditLiability()).resolves.toEqual({
      credits: 550,
      apiLiabilityUsd: expect.closeTo(4.230769, 6),
    });
  });

  it("keeps all base and eligible referred worst-case margins above their floors", () => {
    const margins = getPackMargins();

    expect(margins.every((pack) => pack.baseContributionUsd > 0 && pack.baseMargin >= 0.2)).toBe(
      true
    );
    expect(
      margins
        .filter((pack) => pack.referredMargin !== null)
        .every((pack) => pack.referredContributionUsd! > 0 && pack.referredMargin! >= 0.05)
    ).toBe(true);
  });

  it("alerts on weak blended margin, excessive failed-run spend, and stale rates", () => {
    const alerts = getEconomicsAlerts(
      {
        grossSalesUsd: 10,
        estimatedDodoTransactionFeesUsd: 1,
        refundAmountsUsd: 0,
        refundFeesUsd: 0,
        disputeAmountsUsd: 0,
        disputeFeesUsd: 0,
        netReceiptsUsd: 9,
        apiCogsUsd: 8,
        unpaidFailedRunCogsUsd: 1,
        contributionUsd: 0,
        contributionMargin: 0,
      },
      new Date("2026-10-01T00:00:00Z")
    );

    expect(alerts).toContain("Blended contribution margin is below 10%.");
    expect(alerts).toContain("Unpaid failed-run spend exceeds 10% of paid-run API COGS.");
    expect(alerts.some((alert) => alert.includes("pricing verification is stale"))).toBe(true);
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
  it("uses the provider-reported amount rather than granted bonus credits", async () => {
    const userId = await seedUser(db);
    await db.insert(payments).values({
      userId,
      providerPaymentId: "pay_1",
      amountMinor: 500,
      currency: "USD",
      pack: "bundle",
      catalogPriceUsdMinor: 649,
      creditsGranted: 550,
      estimatedDodoFeeMicros: 659_600,
      economicsVersion: "test",
    });

    const [day] = await getPurchases(30);

    expect(day).toMatchObject({ currency: "USD", amountMinor: 500 });
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

describe("COGS percentiles", () => {
  it("calculates p50 and p90 from completed report cost", async () => {
    const userId = await seedUser(db);
    await db.insert(researches).values(
      [100_000, 200_000, 300_000, 400_000, 1_000_000].map((costMicrosLlm, index) => ({
        userId,
        companyName: `C${index}`,
        interviewType: "dsa",
        status: "done" as const,
        costMicrosLlm,
      }))
    );

    await expect(getCostPercentiles(30)).resolves.toEqual({
      p50Usd: 0.3,
      p90Usd: 1,
      samples: 5,
    });
  });
});
