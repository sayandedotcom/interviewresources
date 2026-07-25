"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { EFFORT_LEVELS, EFFORT_PRESETS, type Effort } from "@/lib/research/budget";

import { chipOn } from "@/features/research/toggle-chip";

/**
 * The Low/Medium/High effort selector, shared by the main gather form and the
 * report's "Gather more rounds" form. Dumb by design: the parent owns the value
 * and the credit ceilings (which differ between a full run and an extension).
 */
export function EffortPicker({
  value,
  onChange,
  credits,
  disabled,
  stacked,
}: {
  value: Effort;
  onChange: (effort: Effort) => void;
  /** Per-level credit ceiling to show; omitted until the balance is known. */
  credits?: Record<Effort, number>;
  disabled?: boolean;
  /** Keep the levels in a single column, for the narrow report estimate rail. */
  stacked?: boolean;
}) {
  return (
    <div className={stacked ? "grid gap-2" : "grid gap-2 sm:grid-cols-3"}>
      {EFFORT_LEVELS.map((level) => {
        const preset = EFFORT_PRESETS[level];
        const on = value === level;
        return (
          <Tooltip key={level}>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled}
                  onClick={() => onChange(level)}
                  aria-pressed={on}
                  className={`h-auto flex-col items-start gap-1 px-3 py-2.5 text-left whitespace-normal ${on ? chipOn : "hover:border-primary/40"}`}
                />
              }>
              <span className="flex w-full items-baseline justify-between gap-2">
                <span className="font-display text-sm font-medium">{preset.label}</span>
                {credits && (
                  <span
                    className={`text-[11px] font-medium ${on ? "text-primary" : "text-muted-foreground"}`}>
                    up to <span className="font-bold">{credits[level]}</span>
                  </span>
                )}
              </span>
              <span
                className={`font-display text-[11px] leading-snug ${on ? "text-primary/70" : "text-muted-foreground"}`}>
                {preset.blurb}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="font-display text-tertiary-foreground space-y-0.5">
                <p className="font-medium">
                  {preset.label} effort — up to ${preset.capUsd.toFixed(2)} spend
                </p>
                <p className="text-xs opacity-70">
                  {preset.queriesHint} searches, {preset.questionTarget} questions
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
