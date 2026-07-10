import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string;
  tone?: "default" | "good" | "critical";
}

/** Stat-tile contract: sentence-case label, compact value, optional tone on the value only. */
export function StatTile({ label, value, tone = "default" }: StatTileProps) {
  return (
    <div className="ring-foreground/10 rounded-xl p-4 ring-1">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold",
          tone === "good" && "text-status-good",
          tone === "critical" && "text-status-critical"
        )}>
        {value}
      </p>
    </div>
  );
}
