import type { RecentRun } from "@/lib/admin/queries";
import { USD_PER_CREDIT } from "@/lib/credits";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<string, string> = {
  done: "text-status-good",
  failed: "text-status-critical",
  degraded: "text-status-warning",
  running: "text-muted-foreground",
  pending: "text-muted-foreground",
};

export function RunsTable({ runs }: { runs: RecentRun[] }) {
  return (
    <div className="ring-foreground/10 overflow-x-auto rounded-xl ring-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left">
            <th className="px-4 py-2 font-medium">Company</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 text-right font-medium">Cost</th>
            <th className="px-4 py-2 text-right font-medium">Billed</th>
            <th className="px-4 py-2 text-right font-medium">Margin</th>
            <th className="px-4 py-2 text-right font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const revenueUsd = (run.creditsCharged ?? 0) * USD_PER_CREDIT;
            const marginUsd = run.creditsCharged == null ? null : revenueUsd - run.costUsd;
            return (
              <tr key={run.id} className="border-b last:border-0">
                <td className="px-4 py-2">{run.companyName}</td>
                <td className={cn("px-4 py-2 font-medium", STATUS_CLASS[run.status])}>
                  {run.status}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">${run.costUsd.toFixed(3)}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {run.creditsCharged == null ? "—" : `${run.creditsCharged} cr`}
                </td>
                <td
                  className={cn(
                    "px-4 py-2 text-right tabular-nums",
                    marginUsd != null && marginUsd < 0 && "text-status-critical"
                  )}>
                  {marginUsd == null ? "—" : `$${marginUsd.toFixed(3)}`}
                </td>
                <td className="text-muted-foreground px-4 py-2 text-right tabular-nums">
                  {run.createdAt.toLocaleString()}
                </td>
              </tr>
            );
          })}
          {runs.length === 0 && (
            <tr>
              <td colSpan={6} className="text-muted-foreground px-4 py-6 text-center">
                No runs yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
