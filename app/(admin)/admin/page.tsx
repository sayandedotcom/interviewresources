import {
  getNegativeBalances,
  getPurchases,
  getRunsByDay,
  getStuckRuns,
  getTopCompanies,
  getUnitEconomics,
  getUnpaidCost,
} from "@/lib/admin/queries";

import { Alerts } from "@/features/admin/alerts";
import { EconomicsChart } from "@/features/admin/economics-chart";
import { RunsChart } from "@/features/admin/runs-chart";
import { StatTile } from "@/features/admin/stat-tile";
import { TopCompaniesTable } from "@/features/admin/top-companies-table";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;

export default async function AdminOverviewPage() {
  const [economics, unpaidCost, runsByDay, stuckRuns, topCompanies, purchases, negativeBalances] =
    await Promise.all([
      getUnitEconomics(WINDOW_DAYS),
      getUnpaidCost(WINDOW_DAYS),
      getRunsByDay(WINDOW_DAYS),
      getStuckRuns(),
      getTopCompanies(10),
      getPurchases(WINDOW_DAYS),
      getNegativeBalances(),
    ]);

  const revenueUsd = economics.reduce((sum, d) => sum + d.revenueUsd, 0);
  const costUsd = economics.reduce((sum, d) => sum + d.costUsd, 0);
  const marginPct = revenueUsd > 0 ? ((revenueUsd - costUsd) / revenueUsd) * 100 : 0;
  const totalRuns = runsByDay.reduce((sum, d) => sum + d.runs, 0);
  const failedRuns = runsByDay.filter((d) => d.status === "failed").reduce((s, d) => s + d.runs, 0);
  const failureRate = totalRuns > 0 ? (failedRuns / totalRuns) * 100 : 0;
  const purchaseUsd = purchases.reduce((sum, d) => sum + d.purchaseUsd, 0);

  return (
    <div className="flex flex-col gap-6">
      <Alerts stuckRuns={stuckRuns} negativeBalances={negativeBalances} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatTile
          label="Gross margin (30d)"
          value={`${marginPct.toFixed(0)}%`}
          tone={marginPct >= 0 ? "good" : "critical"}
        />
        <StatTile label="Revenue (30d)" value={`$${revenueUsd.toFixed(2)}`} />
        <StatTile label="COGS (30d)" value={`$${costUsd.toFixed(2)}`} />
        <StatTile
          label="Unpaid cost (30d)"
          value={`$${unpaidCost.costUsd.toFixed(2)}`}
          tone={unpaidCost.costUsd > 0 ? "critical" : "default"}
        />
        <StatTile label="Runs (30d)" value={String(totalRuns)} />
        <StatTile
          label="Failure rate"
          value={`${failureRate.toFixed(0)}%`}
          tone={failureRate > 10 ? "critical" : "default"}
        />
      </div>

      <div className="ring-foreground/10 rounded-xl p-4 ring-1">
        <h2 className="font-heading mb-4 text-sm font-medium">Revenue vs cost, by day</h2>
        <EconomicsChart data={economics} />
      </div>

      <div className="ring-foreground/10 rounded-xl p-4 ring-1">
        <h2 className="font-heading mb-4 text-sm font-medium">Run volume, by status</h2>
        <RunsChart data={runsByDay} />
      </div>

      <div>
        <h2 className="font-heading mb-2 text-sm font-medium">Top companies</h2>
        <TopCompaniesTable companies={topCompanies} />
      </div>

      <p className="text-muted-foreground text-xs">Real cash in (30d): ${purchaseUsd.toFixed(2)}</p>
    </div>
  );
}
