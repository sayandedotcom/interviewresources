import { AlertTriangleIcon } from "lucide-react";

import type { NegativeBalance, StuckRun } from "@/lib/admin/queries";

interface AlertsProps {
  stuckRuns: StuckRun[];
  negativeBalances: NegativeBalance[];
}

/** Silent when healthy — only renders when there's something to act on. */
export function Alerts({ stuckRuns, negativeBalances }: AlertsProps) {
  if (stuckRuns.length === 0 && negativeBalances.length === 0) return null;

  return (
    <div className="border-status-warning/40 bg-status-warning/10 flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-center gap-2">
        <AlertTriangleIcon className="text-status-warning size-4" aria-hidden />
        <span className="text-sm font-medium">Needs attention</span>
      </div>
      {stuckRuns.length > 0 && (
        <div className="text-sm">
          <p className="text-muted-foreground">
            {stuckRuns.length} run{stuckRuns.length === 1 ? "" : "s"} stuck in &quot;running&quot;
            for over 15 minutes:
          </p>
          <ul className="mt-1 list-inside list-disc">
            {stuckRuns.map((run) => (
              <li key={run.id}>
                {run.companyName} — started {run.createdAt.toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}
      {negativeBalances.length > 0 && (
        <div className="text-sm">
          <p className="text-muted-foreground">
            {negativeBalances.length} user{negativeBalances.length === 1 ? "" : "s"} with a negative
            credit balance:
          </p>
          <ul className="mt-1 list-inside list-disc">
            {negativeBalances.map((u) => (
              <li key={u.userId}>
                {u.email} — {u.balance} credits
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
