"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DayEconomics } from "@/lib/admin/queries";

import { ChartTooltip } from "./chart-tooltip";

const usd = (n: number) => `$${n.toFixed(2)}`;

/**
 * Cash economics and provider cost per day. Every series is USD on one axis.
 */
export function EconomicsChart({ data }: { data: DayEconomics[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
        <XAxis
          dataKey="day"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
        />
        <YAxis
          tickFormatter={usd}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip content={<ChartTooltip formatValue={usd} />} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
          iconType="circle"
          iconSize={8}
        />
        <Line
          name="Net receipts"
          type="monotone"
          dataKey="netReceiptsUsd"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={{ r: 2, fill: "var(--chart-1)" }}
          activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
        />
        <Line
          name="API COGS"
          type="monotone"
          dataKey="apiCogsUsd"
          stroke="var(--chart-2)"
          strokeWidth={2}
          dot={{ r: 2, fill: "var(--chart-2)" }}
          activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
        />
        <Line
          name="Contribution"
          type="monotone"
          dataKey="contributionUsd"
          stroke="var(--chart-3)"
          strokeWidth={2}
          dot={{ r: 2, fill: "var(--chart-3)" }}
          activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
