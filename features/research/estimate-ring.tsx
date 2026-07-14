"use client";

import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";

/** Green until the run is a serious bite out of the balance, then amber, then red. */
const WARNING_AT = 0.6;
const CRITICAL_AT = 0.9;

function gaugeColor(ratio: number): string {
  if (ratio >= CRITICAL_AT) return "var(--status-critical)";
  if (ratio >= WARNING_AT) return "var(--status-warning)";
  return "var(--status-good)";
}

/**
 * How much of the user's balance a run could eat, as a ring. `value` is the top
 * of the estimated range — the pessimistic end — because that's the number that
 * decides whether they can actually afford this.
 *
 * The arc is clamped to the balance so an over-budget estimate doesn't wrap the
 * circle twice; the colour and the surrounding copy carry that news instead.
 */
export function EstimateRing({
  value,
  max,
  className,
}: {
  /** Estimated credits at the high end of the range. */
  value: number;
  /** The user's credit balance. The ring is empty when they hold nothing. */
  max: number;
  className?: string;
}) {
  const ratio = max > 0 ? value / max : 1;
  // The middle of the ring reads as a share of the balance, so it needs the unit:
  // a bare "67" beside a tooltip talking in credits just looks like a third number.
  const percent = Math.min(Math.round(ratio * 100), 100);

  return (
    <AnimatedCircularProgressBar
      max={Math.max(max, 1)}
      value={Math.min(value, Math.max(max, 1))}
      gaugePrimaryColor={gaugeColor(ratio)}
      gaugeSecondaryColor="var(--color-border)"
      className={className ?? "size-20 text-sm"}
      label={`${percent}%`}
    />
  );
}

/** True when the run could cost more than the user holds. */
export function overBudget(value: number, balance: number): boolean {
  return value > balance;
}
