import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db/index";
import { creditsLedger, questionFeedback, reports, researches, users } from "@/lib/db/schema";

/**
 * How many research sessions a user keeps. Starting one past the cap evicts the
 * oldest rather than refusing the run — the sidebar is a recent-work list, not
 * an archive.
 */
export const MAX_SESSIONS_PER_USER = 10;

/** One row of the sidebar's recent-work list. `createdAt` is an ISO string so
 * the shape is identical whether it crossed the RSC boundary as a prop or the
 * `/api/researches` JSON — the sidebar seeds one and refetches the other. */
export interface ResearchSummary {
  id: string;
  companyName: string;
  interviewType: string;
  status: string;
  createdAt: string;
}

/** The user's most recent runs for the sidebar. Shared by the `(app)` layout
 * (initial server render) and the `/api/researches` route (client refetch). */
export async function getUserResearches(userId: string): Promise<ResearchSummary[]> {
  const rows = await db
    .select({
      id: researches.id,
      companyName: researches.companyName,
      interviewType: researches.interviewType,
      status: researches.status,
      createdAt: researches.createdAt,
    })
    .from(researches)
    .innerJoin(reports, eq(reports.researchId, researches.id))
    .where(and(eq(researches.userId, userId), eq(researches.status, "done")))
    .orderBy(desc(researches.createdAt))
    .limit(MAX_SESSIONS_PER_USER);

  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

/**
 * How long a `running` row keeps blocking new runs. Matches the research route's
 * `maxDuration`, which is the longest a run can legitimately still be alive.
 *
 * This is what makes the guard self-healing. A client that disconnects mid-run
 * leaves its row stuck on `running` forever — the route's `catch` never fires,
 * because nothing threw. Without a window that user would be locked out
 * permanently; with one they wait out the ceiling.
 */
export const RUN_INFLIGHT_WINDOW_MS = 300_000;

/**
 * Whether this user already has a run going. The research route's balance check
 * is read-then-spend with no lock, so N concurrent requests all see the same
 * balance and each starts a pipeline against it: the row lock in `chargeCredits`
 * serialises the charge, not the spend. Refusing a second concurrent run is what
 * actually bounds a single account's Gemini and Tavily spend.
 */
export async function hasRunInFlight(userId: string): Promise<boolean> {
  const since = new Date(Date.now() - RUN_INFLIGHT_WINDOW_MS);

  const [row] = await db
    .select({ id: researches.id })
    .from(researches)
    .where(
      and(
        eq(researches.userId, userId),
        eq(researches.status, "running"),
        gt(researches.createdAt, since)
      )
    )
    .limit(1);

  return row !== undefined;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Deletes runs and everything hanging off them.
 *
 * The credits ledger is append-only — a deleted run must not erase the charge it
 * incurred, or the user's balance would silently grow — so its rows are detached
 * from the research instead of removed with it. `credits_ledger.research_id` is
 * nullable precisely so this is possible.
 */
async function deleteRuns(tx: Tx, ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const reportIds = (
    await tx.select({ id: reports.id }).from(reports).where(inArray(reports.researchId, ids))
  ).map((row) => row.id);

  if (reportIds.length > 0) {
    await tx.delete(questionFeedback).where(inArray(questionFeedback.reportId, reportIds));
    await tx.delete(reports).where(inArray(reports.id, reportIds));
  }

  await tx
    .update(creditsLedger)
    .set({ researchId: null })
    .where(inArray(creditsLedger.researchId, ids));

  await tx.delete(researches).where(inArray(researches.id, ids));
}

export type StartResearchResult =
  | {
      status: "started";
      researchId: string;
      balance: number;
      reservationRef: string;
      reservedCredits: number;
    }
  | { status: "insufficient_credits"; balance: number }
  | { status: "run_in_flight" };

/**
 * Checks the balance, enforces one active run, prunes history, and creates the
 * running row under one user-row lock. This is the spend authorization point:
 * concurrent requests for the same account cannot both pass it.
 *
 * The partial unique index on `researches.user_id WHERE status = 'running'` is
 * a database-level backstop for callers outside this helper.
 */
export async function startResearchRun(opts: {
  userId: string;
  minimumCredits: number;
  maximumCredits: number;
  companyName: string;
  interviewers: { name: string; url?: string }[];
  interviewType: string;
  roleContext?: string;
}): Promise<StartResearchResult> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from ${users} where ${users.id} = ${opts.userId} for update`);

    const [running] = await tx
      .select({ id: researches.id })
      .from(researches)
      .where(and(eq(researches.userId, opts.userId), eq(researches.status, "running")))
      .limit(1);

    if (running) return { status: "run_in_flight" as const };

    const [balanceRow] = await tx
      .select({ balance: sql<number>`coalesce(sum(${creditsLedger.delta}), 0)::int` })
      .from(creditsLedger)
      .where(eq(creditsLedger.userId, opts.userId));
    const balance = balanceRow?.balance ?? 0;

    if (balance < opts.minimumCredits) {
      return { status: "insufficient_credits" as const, balance };
    }

    const stale = await tx
      .select({ id: researches.id })
      .from(researches)
      .where(eq(researches.userId, opts.userId))
      .orderBy(desc(researches.createdAt), desc(researches.id))
      .offset(MAX_SESSIONS_PER_USER - 1);
    await deleteRuns(
      tx,
      stale.map((row) => row.id)
    );

    const [research] = await tx
      .insert(researches)
      .values({
        userId: opts.userId,
        companyName: opts.companyName,
        interviewers: opts.interviewers,
        interviewType: opts.interviewType,
        roleContext: opts.roleContext,
        status: "running",
      })
      .returning({ id: researches.id });

    const reservedCredits = Math.min(balance, opts.maximumCredits);
    await tx.insert(creditsLedger).values({
      userId: opts.userId,
      delta: -reservedCredits,
      reason: "research:reservation",
      paymentRef: `reservation:${research.id}`,
      researchId: research.id,
    });

    return {
      status: "started" as const,
      researchId: research.id,
      balance,
      reservationRef: research.id,
      reservedCredits,
    };
  });
}

/**
 * Evicts the user's oldest runs until `keep` remain, returning how many went.
 * Callers about to insert pass `MAX_SESSIONS_PER_USER - 1` so the new run lands
 * inside the cap.
 */
export async function pruneToLimit(
  userId: string,
  keep: number = MAX_SESSIONS_PER_USER - 1
): Promise<number> {
  return db.transaction(async (tx) => {
    // `id` breaks ties, so two runs created in the same millisecond still have a
    // total order and one of them is unambiguously the oldest.
    const stale = await tx
      .select({ id: researches.id })
      .from(researches)
      .where(eq(researches.userId, userId))
      .orderBy(desc(researches.createdAt), desc(researches.id))
      .offset(keep);

    await deleteRuns(
      tx,
      stale.map((row) => row.id)
    );
    return stale.length;
  });
}

/** Deletes one run. False when it is not this user's, or is already gone. */
export async function deleteSession(userId: string, researchId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: researches.id })
      .from(researches)
      .where(and(eq(researches.id, researchId), eq(researches.userId, userId)))
      .limit(1);

    if (!row) return false;

    await deleteRuns(tx, [row.id]);
    return true;
  });
}
