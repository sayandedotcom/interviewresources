"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { RunsByDay } from "@/lib/admin/queries";

import { ChartTooltip } from "./chart-tooltip";

/**
 * Status is state, not identity — colors come from the reserved status
 * palette (never the categorical chart-N slots) so they can't be mistaken
 * for a "series 4". running/pending are in-progress, not an outcome, so they
 * stay in neutral ink rather than borrowing a status hue.
 */
const STATUS_ORDER = ["done", "failed", "degraded", "running", "pending"] as const;
const STATUS_COLOR: Record<(typeof STATUS_ORDER)[number], string> = {
  done: "var(--status-good)",
  failed: "var(--status-critical)",
  degraded: "var(--status-warning)",
  running: "var(--muted-foreground)",
  pending: "var(--border)",
};
const STATUS_LABEL: Record<(typeof STATUS_ORDER)[number], string> = {
  done: "Done",
  failed: "Failed",
  degraded: "Degraded",
  running: "Running",
  pending: "Pending",
};

interface PivotedDay {
  day: string;
  [status: string]: string | number;
}

function pivot(rows: RunsByDay[]): PivotedDay[] {
  const byDay = new Map<string, PivotedDay>();
  for (const row of rows) {
    const entry = byDay.get(row.day) ?? { day: row.day };
    entry[row.status] = row.runs;
    byDay.set(row.day, entry);
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export function RunsChart({ data }: { data: RunsByDay[] }) {
  const pivoted = pivot(data);
  const presentStatuses = STATUS_ORDER.filter((status) =>
    data.some((row) => row.status === status)
  );

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={pivoted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
        <XAxis
          dataKey="day"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={32}
        />
        <Tooltip content={<ChartTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
          iconType="circle"
          iconSize={8}
        />
        {presentStatuses.map((status) => (
          <Bar
            key={status}
            name={STATUS_LABEL[status]}
            dataKey={status}
            stackId="runs"
            fill={STATUS_COLOR[status]}
            maxBarSize={24}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
