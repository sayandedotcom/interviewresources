import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";

import { USD_PER_CREDIT } from "@/lib/credits";
import { db } from "@/lib/db/index";
import { creditsLedger, payments, researches, users } from "@/lib/db/schema";

/** Runs wedged in "running" longer than this have almost certainly lost their route handler. */
const STUCK_RUN_MINUTES = 15;

/**
 * Built from drizzle expressions rather than a raw `sql` template: interpolating
 * a bare Date into the template binds it as an untyped parameter, and postgres.js
 * then fails to serialize it. Wrapping it in `lt()` attaches the column's
 * timestamp encoder.
 */
function isStuck() {
  const cutoff = new Date(Date.now() - STUCK_RUN_MINUTES * 60 * 1000);
  return and(eq(researches.status, "running"), lt(researches.createdAt, cutoff));
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export interface DayEconomics {
  day: string;
  revenueUsd: number;
  costUsd: number;
}

/** Revenue (what we billed) vs COGS (what the run actually cost), per day. */
export async function getUnitEconomics(days: number): Promise<DayEconomics[]> {
  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${researches.createdAt}), 'YYYY-MM-DD')`,
      revenueUsd: sql<number>`coalesce(sum(${researches.creditsCharged}), 0)::float * ${USD_PER_CREDIT}`,
      costUsd: sql<number>`coalesce(sum(${researches.costCentsLlm} + ${researches.costCentsSearch}), 0)::float / 100`,
    })
    .from(researches)
    .where(gte(researches.createdAt, daysAgo(days)))
    .groupBy(sql`date_trunc('day', ${researches.createdAt})`)
    .orderBy(sql`date_trunc('day', ${researches.createdAt})`);

  return rows;
}

export interface UnpaidCost {
  runs: number;
  costUsd: number;
}

/** Cost burned on runs we never billed — unfinished, degraded, or failed. */
export async function getUnpaidCost(days: number): Promise<UnpaidCost> {
  const [row] = await db
    .select({
      runs: sql<number>`count(*)::int`,
      costUsd: sql<number>`coalesce(sum(${researches.costCentsLlm} + ${researches.costCentsSearch}), 0)::float / 100`,
    })
    .from(researches)
    .where(
      sql`${isNull(researches.creditsCharged)} and ${gte(researches.createdAt, daysAgo(days))}`
    );

  return row ?? { runs: 0, costUsd: 0 };
}

export interface RunsByDay {
  day: string;
  status: string;
  runs: number;
}

/** Run volume per day, split by status, so a failure-rate spike shows up. */
export async function getRunsByDay(days: number): Promise<RunsByDay[]> {
  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${researches.createdAt}), 'YYYY-MM-DD')`,
      status: researches.status,
      runs: sql<number>`count(*)::int`,
    })
    .from(researches)
    .where(gte(researches.createdAt, daysAgo(days)))
    .groupBy(sql`date_trunc('day', ${researches.createdAt})`, researches.status)
    .orderBy(sql`date_trunc('day', ${researches.createdAt})`);

  return rows;
}

export interface StuckRun {
  id: string;
  companyName: string;
  createdAt: Date;
}

/**
 * The pipeline runs inline inside the streaming route handler, with no job
 * queue — if the process dies mid-run, the row stays "running" until
 * reapStuckRuns sweeps it. This surfaces the ones not yet swept.
 */
export async function getStuckRuns(): Promise<StuckRun[]> {
  return db
    .select({
      id: researches.id,
      companyName: researches.companyName,
      createdAt: researches.createdAt,
    })
    .from(researches)
    .where(isStuck())
    .orderBy(researches.createdAt);
}

/**
 * Fails runs whose handler died mid-pipeline. Serverless makes this routine
 * rather than rare: every function timeout kills the process partway through
 * an SSE stream, stranding the row in "running".
 *
 * Deliberately does NOT touch the ledger. The research route charges only
 * after the pipeline returns (see chargeCredits in app/api/research/route.ts),
 * so a stranded run was never billed — refunding here would mint free credits.
 *
 * Returns the ids it failed, so the caller can log them.
 */
export async function reapStuckRuns(): Promise<string[]> {
  const reaped = await db
    .update(researches)
    .set({ status: "failed" })
    .where(isStuck())
    .returning({ id: researches.id });

  return reaped.map((r) => r.id);
}

export interface TopCompany {
  companyName: string;
  runs: number;
  avgCostUsd: number;
  avgCreditsCharged: number;
}

export async function getTopCompanies(limit: number): Promise<TopCompany[]> {
  return db
    .select({
      companyName: researches.companyName,
      runs: sql<number>`count(*)::int`,
      avgCostUsd: sql<number>`avg(${researches.costCentsLlm} + ${researches.costCentsSearch})::float / 100`,
      avgCreditsCharged: sql<number>`coalesce(avg(${researches.creditsCharged}), 0)::float`,
    })
    .from(researches)
    .groupBy(researches.companyName)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

export interface DayPurchases {
  day: string;
  currency: string;
  amountMinor: number;
}

/** Real provider-reported cash in, by day and currency. */
export async function getPurchases(days: number): Promise<DayPurchases[]> {
  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${payments.createdAt}), 'YYYY-MM-DD')`,
      currency: payments.currency,
      amountMinor: sql<number>`coalesce(sum(${payments.amountMinor} - ${payments.refundedAmountMinor}), 0)::int`,
    })
    .from(payments)
    .where(gte(payments.createdAt, daysAgo(days)))
    .groupBy(sql`date_trunc('day', ${payments.createdAt})`, payments.currency)
    .orderBy(sql`date_trunc('day', ${payments.createdAt})`, payments.currency);

  return rows;
}

export interface CostPercentiles {
  p50Usd: number;
  p90Usd: number;
  samples: number;
}

/** p50/p90 report COGS, calculated in JS for portability to the PGlite test DB. */
export async function getCostPercentiles(days: number): Promise<CostPercentiles> {
  const rows = await db
    .select({
      cents: sql<number>`${researches.costCentsLlm} + ${researches.costCentsSearch}`,
    })
    .from(researches)
    .where(and(eq(researches.status, "done"), gte(researches.createdAt, daysAgo(days))));
  const costs = rows.map((row) => row.cents).sort((a, b) => a - b);
  const percentile = (p: number) =>
    costs.length === 0
      ? 0
      : costs[Math.min(costs.length - 1, Math.ceil(costs.length * p) - 1)] / 100;
  return { p50Usd: percentile(0.5), p90Usd: percentile(0.9), samples: costs.length };
}

export interface DaySignups {
  day: string;
  signups: number;
}

export async function getUserGrowth(days: number): Promise<DaySignups[]> {
  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${users.createdAt}), 'YYYY-MM-DD')`,
      signups: sql<number>`count(*)::int`,
    })
    .from(users)
    .where(gte(users.createdAt, daysAgo(days)))
    .groupBy(sql`date_trunc('day', ${users.createdAt})`)
    .orderBy(sql`date_trunc('day', ${users.createdAt})`);

  return rows;
}

export interface RecentRun {
  id: string;
  companyName: string;
  status: string;
  costUsd: number;
  creditsCharged: number | null;
  createdAt: Date;
}

/** Drill-down list for the /admin/runs table — most recent first. */
export async function getRecentRuns(limit: number): Promise<RecentRun[]> {
  return db
    .select({
      id: researches.id,
      companyName: researches.companyName,
      status: researches.status,
      costUsd: sql<number>`(${researches.costCentsLlm} + ${researches.costCentsSearch})::float / 100`,
      creditsCharged: researches.creditsCharged,
      createdAt: researches.createdAt,
    })
    .from(researches)
    .orderBy(desc(researches.createdAt))
    .limit(limit);
}

export interface NegativeBalance {
  userId: string;
  email: string;
  balance: number;
}

/**
 * chargeCredits (lib/credits.ts) charges unconditionally, so a user racing two
 * concurrent runs can end up below zero. Nothing else in the app detects it.
 */
export async function getNegativeBalances(): Promise<NegativeBalance[]> {
  const rows = await db
    .select({
      userId: creditsLedger.userId,
      email: users.email,
      balance: sql<number>`sum(${creditsLedger.delta})::int`,
    })
    .from(creditsLedger)
    .innerJoin(users, eq(users.id, creditsLedger.userId))
    .groupBy(creditsLedger.userId, users.email)
    .having(sql`sum(${creditsLedger.delta}) < 0`);

  return rows;
}
