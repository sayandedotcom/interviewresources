import {
  getContributionEconomics,
  getCostPercentiles,
  getEconomicsAlerts,
  getNegativeBalances,
  getOutstandingCreditLiability,
  getPackMargins,
  getRunsByDay,
  getStuckRuns,
  getTopCompanies,
  getUnitEconomics,
} from "@/lib/admin/queries";
import { ECONOMICS } from "@/lib/economics";

import { Alerts } from "@/features/admin/alerts";
import { EconomicsChart } from "@/features/admin/economics-chart";
import { RunsChart } from "@/features/admin/runs-chart";
import { StatTile } from "@/features/admin/stat-tile";
import { TopCompaniesTable } from "@/features/admin/top-companies-table";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;

export default async function AdminOverviewPage() {
  const [
    economics,
    runsByDay,
    stuckRuns,
    topCompanies,
    negativeBalances,
    costPercentiles,
    contribution,
    outstandingLiability,
  ] = await Promise.all([
    getUnitEconomics(WINDOW_DAYS),
    getRunsByDay(WINDOW_DAYS),
    getStuckRuns(),
    getTopCompanies(10),
    getNegativeBalances(),
    getCostPercentiles(WINDOW_DAYS),
    getContributionEconomics(WINDOW_DAYS),
    getOutstandingCreditLiability(),
  ]);

  const totalRuns = runsByDay.reduce((sum, d) => sum + d.runs, 0);
  const failedRuns = runsByDay.filter((d) => d.status === "failed").reduce((s, d) => s + d.runs, 0);
  const failureRate = totalRuns > 0 ? (failedRuns / totalRuns) * 100 : 0;
  const dodoFeesUsd =
    contribution.estimatedDodoTransactionFeesUsd +
    contribution.refundFeesUsd +
    contribution.disputeFeesUsd;
  const refundsAndDisputesUsd = contribution.refundAmountsUsd + contribution.disputeAmountsUsd;
  const packMargins = getPackMargins();
  const economicsAlerts = getEconomicsAlerts(contribution);

  return (
    <div className="flex flex-col gap-6">
      <Alerts
        stuckRuns={stuckRuns}
        negativeBalances={negativeBalances}
        economicsAlerts={economicsAlerts}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatTile
          label="Contribution margin (30d)"
          value={`${(contribution.contributionMargin * 100).toFixed(0)}%`}
          tone={contribution.contributionMargin >= 0.1 ? "good" : "critical"}
        />
        <StatTile label="Gross sales (30d)" value={`$${contribution.grossSalesUsd.toFixed(2)}`} />
        <StatTile label="Estimated Dodo fees" value={`$${dodoFeesUsd.toFixed(2)}`} />
        <StatTile label="Refunds + disputes" value={`$${refundsAndDisputesUsd.toFixed(2)}`} />
        <StatTile label="Net receipts (30d)" value={`$${contribution.netReceiptsUsd.toFixed(2)}`} />
        <StatTile label="API COGS (paid runs)" value={`$${contribution.apiCogsUsd.toFixed(2)}`} />
        <StatTile
          label="Unpaid failed-run COGS"
          value={`$${contribution.unpaidFailedRunCogsUsd.toFixed(2)}`}
          tone={contribution.unpaidFailedRunCogsUsd > 0 ? "critical" : "default"}
        />
        <StatTile
          label="Contribution (30d)"
          value={`$${contribution.contributionUsd.toFixed(2)}`}
          tone={contribution.contributionUsd >= 0 ? "good" : "critical"}
        />
        <StatTile
          label="Outstanding API liability"
          value={`$${outstandingLiability.apiLiabilityUsd.toFixed(2)}`}
        />
        <StatTile label="p50 COGS" value={`$${costPercentiles.p50Usd.toFixed(2)}`} />
        <StatTile label="p90 COGS" value={`$${costPercentiles.p90Usd.toFixed(2)}`} />
        <StatTile label="Runs (30d)" value={String(totalRuns)} />
        <StatTile
          label="Failure rate"
          value={`${failureRate.toFixed(0)}%`}
          tone={failureRate > 10 ? "critical" : "default"}
        />
      </div>

      <div className="ring-foreground/10 rounded-xl p-4 ring-1">
        <h2 className="font-heading mb-4 text-sm font-medium">
          Net receipts, contribution, and API COGS by day
        </h2>
        <EconomicsChart data={economics} />
      </div>

      <div className="ring-foreground/10 rounded-xl p-4 ring-1">
        <h2 className="font-heading mb-4 text-sm font-medium">
          Pack worst-case contribution margins
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {packMargins.map((pack) => (
            <div key={pack.slug} className="bg-muted/40 rounded-lg p-3 text-sm">
              <p className="font-medium">{pack.name}</p>
              <p className="text-muted-foreground mt-1">
                Base: ${pack.baseContributionUsd.toFixed(2)} ({(pack.baseMargin * 100).toFixed(1)}%)
              </p>
              {pack.referredMargin !== null && (
                <p className="text-muted-foreground">
                  Referred: ${pack.referredContributionUsd!.toFixed(2)} (
                  {(pack.referredMargin * 100).toFixed(1)}%)
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="ring-foreground/10 rounded-xl p-4 ring-1">
        <h2 className="font-heading mb-4 text-sm font-medium">Run volume, by status</h2>
        <RunsChart data={runsByDay} />
      </div>

      <div>
        <h2 className="font-heading mb-2 text-sm font-medium">Top companies</h2>
        <TopCompaniesTable companies={topCompanies} />
      </div>
      <p className="text-muted-foreground text-xs">
        Contribution margin is not net profit. Monthly fixed costs are configured separately at $
        {ECONOMICS.monthlyFixedCostsUsd.toFixed(2)} and exclude hosting, database, support,
        advertising, and tax. Outstanding liability covers {outstandingLiability.credits} spendable
        credits. COGS percentiles use {costPercentiles.samples} completed runs.
      </p>
    </div>
  );
}
