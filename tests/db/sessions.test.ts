import { desc, eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { creditsLedger, questionFeedback, reports, researches } from "@/lib/db/schema";

import { type TestDb, createTestDb, resetDb, seedUser } from "./harness";

/**
 * Eviction deletes across four tables with foreign keys between them, and it
 * must leave the credits ledger's SUM(delta) untouched — a run that vanishes
 * cannot take its charge with it, or a user could mint credits by filling the
 * sidebar. None of that is expressible against a mocked `db`, so these run
 * against a real Postgres (PGlite).
 */

const dbPromise = createTestDb();
vi.mock("@/lib/db/index", async () => ({ db: await dbPromise }));

const {
  MAX_SESSIONS_PER_USER,
  RUN_INFLIGHT_WINDOW_MS,
  deleteSession,
  hasRunInFlight,
  pruneToLimit,
  startResearchRun,
} = await import("@/lib/research/sessions");
const { getBalance } = await import("@/lib/credits");

let db: TestDb;

beforeAll(async () => {
  db = await dbPromise;
});

afterEach(async () => {
  await resetDb(db);
});

/** Inserts a run whose `createdAt` is `ageMinutes` in the past. */
async function seedRun(
  userId: string,
  companyName: string,
  ageMinutes: number,
  status: (typeof researches.status.enumValues)[number] = "done"
): Promise<string> {
  const [row] = await db
    .insert(researches)
    .values({
      userId,
      companyName,
      interviewType: "dsa",
      status,
      createdAt: new Date(Date.now() - ageMinutes * 60_000),
    })
    .returning({ id: researches.id });
  return row.id;
}

async function seedReport(researchId: string): Promise<string> {
  const [row] = await db
    .insert(reports)
    .values({ researchId, jsonPayload: { questions: [] } })
    .returning({ id: reports.id });
  return row.id;
}

async function companies(userId: string): Promise<string[]> {
  const rows = await db
    .select({ companyName: researches.companyName })
    .from(researches)
    .where(eq(researches.userId, userId))
    .orderBy(desc(researches.createdAt));
  return rows.map((r) => r.companyName);
}

describe("pruneToLimit", () => {
  it("keeps a user under the cap by dropping the oldest runs", async () => {
    const userId = await seedUser(db);
    // Seeded newest-first by age: "c0" is the youngest.
    for (let i = 0; i < 12; i++) await seedRun(userId, `c${i}`, i);

    const evicted = await pruneToLimit(userId, MAX_SESSIONS_PER_USER);

    expect(evicted).toBe(2);
    expect(await companies(userId)).toEqual(
      Array.from({ length: MAX_SESSIONS_PER_USER }, (_, i) => `c${i}`)
    );
  });

  it("leaves room for the run about to be inserted", async () => {
    const userId = await seedUser(db);
    for (let i = 0; i < MAX_SESSIONS_PER_USER; i++) await seedRun(userId, `c${i}`, i);

    await pruneToLimit(userId, MAX_SESSIONS_PER_USER - 1);

    expect(await companies(userId)).toHaveLength(MAX_SESSIONS_PER_USER - 1);
  });

  it("evicts nothing when the user is under the cap", async () => {
    const userId = await seedUser(db);
    await seedRun(userId, "stripe", 1);

    await expect(pruneToLimit(userId)).resolves.toBe(0);
    expect(await companies(userId)).toEqual(["stripe"]);
  });

  it("never touches another user's runs", async () => {
    const userId = await seedUser(db);
    const other = await seedUser(db);
    for (let i = 0; i < 12; i++) await seedRun(userId, `c${i}`, i);
    await seedRun(other, "theirs", 999);

    await pruneToLimit(userId);

    expect(await companies(other)).toEqual(["theirs"]);
  });

  it("takes the evicted run's report and feedback with it", async () => {
    const userId = await seedUser(db);
    for (let i = 0; i < 11; i++) {
      const researchId = await seedRun(userId, `c${i}`, i);
      const reportId = await seedReport(researchId);
      await db.insert(questionFeedback).values({ reportId, questionIdx: 0, verdict: "asked" });
    }

    await pruneToLimit(userId);

    // Nine survive (cap minus the slot held for the incoming run), each with its report.
    expect(await db.select().from(reports)).toHaveLength(MAX_SESSIONS_PER_USER - 1);
    expect(await db.select().from(questionFeedback)).toHaveLength(MAX_SESSIONS_PER_USER - 1);
  });

  it("preserves the balance of a user whose charged run is evicted", async () => {
    const userId = await seedUser(db);
    await db.insert(creditsLedger).values({ userId, delta: 500, reason: "grant" });

    for (let i = 0; i < 11; i++) {
      const researchId = await seedRun(userId, `c${i}`, i);
      await db.insert(creditsLedger).values({ userId, delta: -10, reason: "research", researchId });
    }

    await pruneToLimit(userId);

    // 500 - 11 * 10. The two evicted charges survive as detached ledger rows.
    await expect(getBalance(userId)).resolves.toBe(390);
    expect(await db.select().from(creditsLedger)).toHaveLength(12);
  });
});

describe("deleteSession", () => {
  it("deletes the caller's run and its report", async () => {
    const userId = await seedUser(db);
    const researchId = await seedRun(userId, "stripe", 1);
    await seedReport(researchId);

    await expect(deleteSession(userId, researchId)).resolves.toBe(true);
    expect(await companies(userId)).toEqual([]);
    expect(await db.select().from(reports)).toEqual([]);
  });

  it("refuses to delete a run belonging to another user", async () => {
    const owner = await seedUser(db);
    const attacker = await seedUser(db);
    const researchId = await seedRun(owner, "stripe", 1);

    await expect(deleteSession(attacker, researchId)).resolves.toBe(false);
    expect(await companies(owner)).toEqual(["stripe"]);
  });

  it("returns false for a run that does not exist", async () => {
    const userId = await seedUser(db);

    await expect(deleteSession(userId, "00000000-0000-0000-0000-000000000000")).resolves.toBe(
      false
    );
  });

  it("keeps the charge on the ledger after the run is deleted", async () => {
    const userId = await seedUser(db);
    const researchId = await seedRun(userId, "stripe", 1);
    await db.insert(creditsLedger).values({ userId, delta: 100, reason: "grant" });
    await db.insert(creditsLedger).values({ userId, delta: -30, reason: "research", researchId });

    await deleteSession(userId, researchId);

    await expect(getBalance(userId)).resolves.toBe(70);
  });
});

/**
 * The guard is a time-windowed query, and the window is the whole point: a stale
 * `running` row must stop blocking once it outlives the route's `maxDuration`.
 * That expiry is a Postgres timestamp comparison, so it only means something
 * against a real database.
 */
describe("hasRunInFlight", () => {
  const windowMinutes = RUN_INFLIGHT_WINDOW_MS / 60_000;

  it("is false for a user with no runs at all", async () => {
    const userId = await seedUser(db);

    await expect(hasRunInFlight(userId)).resolves.toBe(false);
  });

  it("is true while a fresh run is still going", async () => {
    const userId = await seedUser(db);
    await seedRun(userId, "stripe", 0, "running");

    await expect(hasRunInFlight(userId)).resolves.toBe(true);
  });

  it("ignores runs that already settled, however recent", async () => {
    const userId = await seedUser(db);
    await seedRun(userId, "stripe", 0, "done");
    await seedRun(userId, "figma", 0, "failed");

    await expect(hasRunInFlight(userId)).resolves.toBe(false);
  });

  it("stops blocking once a stuck run outlives the window", async () => {
    const userId = await seedUser(db);
    // A client that disconnects leaves `running` set forever; the window is the
    // only thing that ever clears it.
    await seedRun(userId, "stripe", windowMinutes + 1, "running");

    await expect(hasRunInFlight(userId)).resolves.toBe(false);
  });

  it("still blocks a run sitting just inside the window", async () => {
    const userId = await seedUser(db);
    await seedRun(userId, "stripe", windowMinutes - 1, "running");

    await expect(hasRunInFlight(userId)).resolves.toBe(true);
  });

  it("does not let one user's run block another's", async () => {
    const busy = await seedUser(db);
    const idle = await seedUser(db);
    await seedRun(busy, "stripe", 0, "running");

    await expect(hasRunInFlight(busy)).resolves.toBe(true);
    await expect(hasRunInFlight(idle)).resolves.toBe(false);
  });
});

describe("startResearchRun", () => {
  const input = (userId: string) => ({
    userId,
    minimumCredits: 50,
    companyName: "Stripe",
    interviewers: [],
    interviewType: "dsa",
  });

  it("checks balance and creates the active row atomically", async () => {
    const userId = await seedUser(db);
    await db.insert(creditsLedger).values({ userId, delta: 100, reason: "grant" });

    await expect(startResearchRun(input(userId))).resolves.toMatchObject({
      status: "started",
      balance: 100,
    });
    expect(await companies(userId)).toEqual(["Stripe"]);
  });

  it("does not create a row when the balance is below the floor", async () => {
    const userId = await seedUser(db);

    await expect(startResearchRun(input(userId))).resolves.toEqual({
      status: "insufficient_credits",
      balance: 0,
    });
    expect(await companies(userId)).toEqual([]);
  });

  it("refuses a second active run for the same user", async () => {
    const userId = await seedUser(db);
    await db.insert(creditsLedger).values({ userId, delta: 100, reason: "grant" });

    await startResearchRun(input(userId));
    await expect(startResearchRun(input(userId))).resolves.toEqual({
      status: "run_in_flight",
    });
  });

  it("backs the application lock with a partial unique index", async () => {
    const userId = await seedUser(db);
    await seedRun(userId, "first", 0, "running");

    await expect(seedRun(userId, "second", 0, "running")).rejects.toThrow();
  });
});
