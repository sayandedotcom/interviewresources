import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db/index";
import {
  creditsLedger,
  paymentDisputes,
  paymentRefunds,
  payments,
  researches,
  users,
} from "@/lib/db/schema";
import {
  CREDIT_PACK_CATALOG,
  ECONOMICS,
  creditLiabilityMicros,
  getPackEconomics,
  microsToUsd,
  providerPricesAreStale,
} from "@/lib/economics";

const STUCK_RUN_MINUTES = 15;

function isStuck() {
  const cutoff = new Date(Date.now() - STUCK_RUN_MINUTES * 60 * 1_000);
  return and(eq(researches.status, "running"), lt(researches.createdAt, cutoff));
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1_000);
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function proportionalCatalogMicros(
  catalogPriceUsdMinor: number,
  providerPartMinor: number,
  providerTotalMinor: number
): number {
  if (providerTotalMinor <= 0) return 0;
  return Math.round(
    catalogPriceUsdMinor * 10_000 * Math.min(1, Math.max(0, providerPartMinor) / providerTotalMinor)
  );
}

const disputeLossStatuses = new Set([
  "dispute_opened",
  "dispute_expired",
  "dispute_accepted",
  "dispute_challenged",
  "dispute_lost",
]);

async function getEconomicsRows(days: number) {
  const cutoff = daysAgo(days);
  const paymentRows = await db
    .select({
      id: payments.id,
      createdAt: payments.createdAt,
      amountMinor: payments.amountMinor,
      catalogPriceUsdMinor: payments.catalogPriceUsdMinor,
      estimatedDodoFeeMicros: payments.estimatedDodoFeeMicros,
      refundedAmountMinor: payments.refundedAmountMinor,
    })
    .from(payments)
    .where(gte(payments.createdAt, cutoff));
  const paymentIds = new Set(paymentRows.map((payment) => payment.id));

  const refundRows = (
    await db
      .select({
        paymentId: paymentRefunds.paymentId,
        estimatedFeeMicros: paymentRefunds.estimatedFeeMicros,
      })
      .from(paymentRefunds)
  ).filter((refund) => paymentIds.has(refund.paymentId));

  const disputeRows = (
    await db
      .select({
        paymentId: paymentDisputes.paymentId,
        amountMinor: paymentDisputes.amountMinor,
        status: paymentDisputes.status,
        estimatedFeeMicros: paymentDisputes.estimatedFeeMicros,
      })
      .from(paymentDisputes)
  ).filter((dispute) => paymentIds.has(dispute.paymentId));

  const researchRows = await db
    .select({
      createdAt: researches.createdAt,
      costMicros: sql<number>`${researches.costMicrosLlm} + ${researches.costMicrosSearch}`,
      creditsCharged: researches.creditsCharged,
    })
    .from(researches)
    .where(gte(researches.createdAt, cutoff));

  return { paymentRows, refundRows, disputeRows, researchRows };
}

export interface ContributionEconomics {
  grossSalesUsd: number;
  estimatedDodoTransactionFeesUsd: number;
  refundAmountsUsd: number;
  refundFeesUsd: number;
  disputeAmountsUsd: number;
  disputeFeesUsd: number;
  netReceiptsUsd: number;
  apiCogsUsd: number;
  unpaidFailedRunCogsUsd: number;
  contributionUsd: number;
  contributionMargin: number;
}

function summarizeEconomics(
  rows: Awaited<ReturnType<typeof getEconomicsRows>>
): ContributionEconomics {
  const paymentById = new Map(rows.paymentRows.map((payment) => [payment.id, payment]));
  const grossSalesMicros = rows.paymentRows.reduce(
    (sum, payment) => sum + payment.catalogPriceUsdMinor * 10_000,
    0
  );
  const transactionFeeMicros = rows.paymentRows.reduce(
    (sum, payment) => sum + payment.estimatedDodoFeeMicros,
    0
  );
  const refundAmountMicros = rows.paymentRows.reduce(
    (sum, payment) =>
      sum +
      proportionalCatalogMicros(
        payment.catalogPriceUsdMinor,
        payment.refundedAmountMinor,
        payment.amountMinor
      ),
    0
  );
  const refundFeeMicros = rows.refundRows.reduce(
    (sum, refund) => sum + refund.estimatedFeeMicros,
    0
  );
  const disputeAmountMicros = rows.disputeRows.reduce((sum, dispute) => {
    if (!disputeLossStatuses.has(dispute.status)) return sum;
    const payment = paymentById.get(dispute.paymentId);
    if (!payment) return sum;
    return (
      sum +
      proportionalCatalogMicros(
        payment.catalogPriceUsdMinor,
        dispute.amountMinor,
        payment.amountMinor
      )
    );
  }, 0);
  const disputeFeeMicros = rows.disputeRows.reduce(
    (sum, dispute) => sum + dispute.estimatedFeeMicros,
    0
  );
  const paidCogsMicros = rows.researchRows
    .filter((run) => run.creditsCharged !== null)
    .reduce((sum, run) => sum + run.costMicros, 0);
  const unpaidCogsMicros = rows.researchRows
    .filter((run) => run.creditsCharged === null)
    .reduce((sum, run) => sum + run.costMicros, 0);
  const netReceiptsMicros =
    grossSalesMicros -
    transactionFeeMicros -
    refundAmountMicros -
    refundFeeMicros -
    disputeAmountMicros -
    disputeFeeMicros;
  const contributionMicros = netReceiptsMicros - paidCogsMicros - unpaidCogsMicros;

  return {
    grossSalesUsd: microsToUsd(grossSalesMicros),
    estimatedDodoTransactionFeesUsd: microsToUsd(transactionFeeMicros),
    refundAmountsUsd: microsToUsd(refundAmountMicros),
    refundFeesUsd: microsToUsd(refundFeeMicros),
    disputeAmountsUsd: microsToUsd(disputeAmountMicros),
    disputeFeesUsd: microsToUsd(disputeFeeMicros),
    netReceiptsUsd: microsToUsd(netReceiptsMicros),
    apiCogsUsd: microsToUsd(paidCogsMicros),
    unpaidFailedRunCogsUsd: microsToUsd(unpaidCogsMicros),
    contributionUsd: microsToUsd(contributionMicros),
    contributionMargin: netReceiptsMicros > 0 ? contributionMicros / netReceiptsMicros : 0,
  };
}

export async function getContributionEconomics(days: number): Promise<ContributionEconomics> {
  return summarizeEconomics(await getEconomicsRows(days));
}

export interface DayEconomics {
  day: string;
  grossSalesUsd: number;
  netReceiptsUsd: number;
  apiCogsUsd: number;
  contributionUsd: number;
}

/** Actual sales receipts and provider COGS, grouped independently by day. */
export async function getUnitEconomics(days: number): Promise<DayEconomics[]> {
  const rows = await getEconomicsRows(days);
  type DayRows = typeof rows;
  const daysByKey = new Map<string, DayRows>();
  const ensure = (day: string): DayRows => {
    const existing = daysByKey.get(day);
    if (existing) return existing;
    const created: DayRows = {
      paymentRows: [],
      refundRows: [],
      disputeRows: [],
      researchRows: [],
    };
    daysByKey.set(day, created);
    return created;
  };

  for (const payment of rows.paymentRows)
    ensure(dayKey(payment.createdAt)).paymentRows.push(payment);
  for (const run of rows.researchRows) ensure(dayKey(run.createdAt)).researchRows.push(run);

  // Refund/dispute events are attributed to the purchase day in this compact
  // chart; the 30-day total remains exact.
  const paymentDay = new Map(
    rows.paymentRows.map((payment) => [payment.id, dayKey(payment.createdAt)])
  );
  for (const refund of rows.refundRows) {
    const day = paymentDay.get(refund.paymentId);
    if (day) ensure(day).refundRows.push(refund);
  }
  for (const dispute of rows.disputeRows) {
    const day = paymentDay.get(dispute.paymentId);
    if (day) ensure(day).disputeRows.push(dispute);
  }

  return [...daysByKey.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, dayRows]) => {
      const summary = summarizeEconomics(dayRows);
      return {
        day,
        grossSalesUsd: summary.grossSalesUsd,
        netReceiptsUsd: summary.netReceiptsUsd,
        apiCogsUsd: summary.apiCogsUsd + summary.unpaidFailedRunCogsUsd,
        contributionUsd: summary.contributionUsd,
      };
    });
}

export interface UnpaidCost {
  runs: number;
  costUsd: number;
}

export async function getUnpaidCost(days: number): Promise<UnpaidCost> {
  const [row] = await db
    .select({
      runs: sql<number>`count(*)::int`,
      costUsd: sql<number>`coalesce(sum(${researches.costMicrosLlm} + ${researches.costMicrosSearch}), 0)::float / 1000000`,
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

export async function getRunsByDay(days: number): Promise<RunsByDay[]> {
  return db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${researches.createdAt}), 'YYYY-MM-DD')`,
      status: researches.status,
      runs: sql<number>`count(*)::int`,
    })
    .from(researches)
    .where(gte(researches.createdAt, daysAgo(days)))
    .groupBy(sql`date_trunc('day', ${researches.createdAt})`, researches.status)
    .orderBy(sql`date_trunc('day', ${researches.createdAt})`);
}

export interface StuckRun {
  id: string;
  companyName: string;
  createdAt: Date;
}

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

export async function reapStuckRuns(): Promise<string[]> {
  const reaped = await db
    .update(researches)
    .set({ status: "failed" })
    .where(isStuck())
    .returning({ id: researches.id });
  return reaped.map((run) => run.id);
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
      avgCostUsd: sql<number>`avg(${researches.costMicrosLlm} + ${researches.costMicrosSearch})::float / 1000000`,
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

export async function getPurchases(days: number): Promise<DayPurchases[]> {
  return db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${payments.createdAt}), 'YYYY-MM-DD')`,
      currency: payments.currency,
      amountMinor: sql<number>`coalesce(sum(${payments.amountMinor} - ${payments.refundedAmountMinor}), 0)::int`,
    })
    .from(payments)
    .where(gte(payments.createdAt, daysAgo(days)))
    .groupBy(sql`date_trunc('day', ${payments.createdAt})`, payments.currency)
    .orderBy(sql`date_trunc('day', ${payments.createdAt})`, payments.currency);
}

export interface CostPercentiles {
  p50Usd: number;
  p90Usd: number;
  samples: number;
}

export async function getCostPercentiles(days: number): Promise<CostPercentiles> {
  const rows = await db
    .select({
      micros: sql<number>`${researches.costMicrosLlm} + ${researches.costMicrosSearch}`,
    })
    .from(researches)
    .where(and(eq(researches.status, "done"), gte(researches.createdAt, daysAgo(days))));
  const costs = rows.map((row) => row.micros).sort((a, b) => a - b);
  const percentile = (p: number) =>
    costs.length === 0
      ? 0
      : costs[Math.min(costs.length - 1, Math.ceil(costs.length * p) - 1)] / 1_000_000;
  return { p50Usd: percentile(0.5), p90Usd: percentile(0.9), samples: costs.length };
}

export interface DaySignups {
  day: string;
  signups: number;
}

export async function getUserGrowth(days: number): Promise<DaySignups[]> {
  return db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${users.createdAt}), 'YYYY-MM-DD')`,
      signups: sql<number>`count(*)::int`,
    })
    .from(users)
    .where(gte(users.createdAt, daysAgo(days)))
    .groupBy(sql`date_trunc('day', ${users.createdAt})`)
    .orderBy(sql`date_trunc('day', ${users.createdAt})`);
}

export interface RecentRun {
  id: string;
  companyName: string;
  status: string;
  costUsd: number;
  creditsCharged: number | null;
  createdAt: Date;
}

export async function getRecentRuns(limit: number): Promise<RecentRun[]> {
  return db
    .select({
      id: researches.id,
      companyName: researches.companyName,
      status: researches.status,
      costUsd: sql<number>`(${researches.costMicrosLlm} + ${researches.costMicrosSearch})::float / 1000000`,
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

export async function getNegativeBalances(): Promise<NegativeBalance[]> {
  return db
    .select({
      userId: creditsLedger.userId,
      email: users.email,
      balance: sql<number>`sum(${creditsLedger.delta})::int`,
    })
    .from(creditsLedger)
    .innerJoin(users, eq(users.id, creditsLedger.userId))
    .groupBy(creditsLedger.userId, users.email)
    .having(sql`sum(${creditsLedger.delta}) < 0`);
}

export interface OutstandingCreditLiability {
  credits: number;
  apiLiabilityUsd: number;
}

export async function getOutstandingCreditLiability(): Promise<OutstandingCreditLiability> {
  const balances = await db
    .select({ balance: sql<number>`sum(${creditsLedger.delta})::int` })
    .from(creditsLedger)
    .groupBy(creditsLedger.userId);
  const credits = balances.reduce((sum, row) => sum + Math.max(0, row.balance), 0);
  return { credits, apiLiabilityUsd: microsToUsd(creditLiabilityMicros(credits)) };
}

export interface PackMargin {
  slug: string;
  name: string;
  baseContributionUsd: number;
  baseMargin: number;
  referredContributionUsd: number | null;
  referredMargin: number | null;
}

export function getPackMargins(): PackMargin[] {
  return CREDIT_PACK_CATALOG.map((pack) => {
    const base = getPackEconomics(pack.slug);
    const referralEligible = ECONOMICS.referrals.eligiblePacks.some(
      (eligible) => eligible === pack.slug
    );
    const referred = referralEligible ? getPackEconomics(pack.slug, true) : null;
    return {
      slug: pack.slug,
      name: pack.name,
      baseContributionUsd: microsToUsd(base.contributionMicros),
      baseMargin: base.contributionMargin,
      referredContributionUsd: referred ? microsToUsd(referred.contributionMicros) : null,
      referredMargin: referred?.contributionMargin ?? null,
    };
  });
}

export function getEconomicsAlerts(
  summary: ContributionEconomics,
  now: Date = new Date()
): string[] {
  const alerts: string[] = [];
  for (const margin of getPackMargins()) {
    if (margin.baseContributionUsd <= 0 || margin.baseMargin < ECONOMICS.margins.baseFloor) {
      alerts.push(`${margin.name} base worst-case margin is below the 20% floor.`);
    }
    if (
      margin.referredMargin !== null &&
      (margin.referredContributionUsd! <= 0 ||
        margin.referredMargin < ECONOMICS.margins.referredFloor)
    ) {
      alerts.push(`${margin.name} referred worst-case margin is below the 5% floor.`);
    }
  }
  if (
    summary.netReceiptsUsd > 0 &&
    summary.contributionMargin < ECONOMICS.margins.blendedAlertFloor
  ) {
    alerts.push("Blended contribution margin is below 10%.");
  }
  if (
    summary.unpaidFailedRunCogsUsd > 0 &&
    (summary.apiCogsUsd === 0 ||
      summary.unpaidFailedRunCogsUsd / summary.apiCogsUsd > ECONOMICS.alerts.failedRunSpendRatio)
  ) {
    alerts.push("Unpaid failed-run spend exceeds 10% of paid-run API COGS.");
  }
  if (providerPricesAreStale(now)) {
    alerts.push("Provider pricing verification is stale; review Gemini, Tavily, and Dodo rates.");
  }
  return alerts;
}
