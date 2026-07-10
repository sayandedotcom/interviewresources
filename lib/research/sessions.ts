import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/index";
import { creditsLedger, questionFeedback, reports, researches } from "@/lib/db/schema";

/**
 * How many research sessions a user keeps. Starting one past the cap evicts the
 * oldest rather than refusing the run — the sidebar is a recent-work list, not
 * an archive.
 */
export const MAX_SESSIONS_PER_USER = 10;

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
