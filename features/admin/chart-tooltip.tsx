interface ChartTooltipProps {
  active?: boolean;
  label?: string;
  payload?: { name: string; value: number; color?: string }[];
  formatValue?: (value: number) => string;
}

/** Shared tooltip shell for the admin charts — matches the card surface, not Recharts' default. */
export function ChartTooltip({ active, label, payload, formatValue }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-card ring-foreground/10 rounded-lg p-3 text-xs shadow-sm ring-1">
      {label && <p className="text-muted-foreground mb-1.5 font-medium">{label}</p>}
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <span
              className="inline-block size-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-medium tabular-nums">
              {formatValue ? formatValue(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
