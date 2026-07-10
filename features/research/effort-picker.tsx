"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { EFFORT_LEVELS, EFFORT_PRESETS, type Effort } from "@/lib/research/budget";

/**
 * The Low/Medium/High effort selector, shared by the main scout form and the
 * report's "Scout more rounds" form. Dumb by design: the parent owns the value
 * and the credit ceilings (which differ between a full run and an extension).
 */
export function EffortPicker({
  value,
  onChange,
  credits,
  disabled,
}: {
  value: Effort;
  onChange: (effort: Effort) => void;
  /** Per-level credit ceiling to show; omitted until the balance is known. */
  credits?: Record<Effort, number>;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {EFFORT_LEVELS.map((level) => {
        const preset = EFFORT_PRESETS[level];
        const on = value === level;
        return (
          <Tooltip key={level}>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant={on ? "default" : "outline"}
                  disabled={disabled}
                  onClick={() => onChange(level)}
                  aria-pressed={on}
                  className={`h-auto flex-col items-start gap-1 px-3 py-2.5 text-left whitespace-normal ${on ? "" : "hover:border-tertiary/40"}`}
                />
              }>
              <span className="flex w-full items-baseline justify-between gap-2">
                <span className="font-display text-sm font-medium">{preset.label}</span>
                {credits && (
                  <span className={`font-mono text-[10px] ${on ? "opacity-70" : "text-tertiary"}`}>
                    ≤{credits[level]}
                  </span>
                )}
              </span>
              <span
                className={`font-display text-[11px] leading-snug ${on ? "opacity-70" : "text-muted-foreground"}`}>
                {preset.blurb}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="font-display space-y-0.5">
                <p className="font-medium">{preset.label} effort — up to ${preset.capUsd.toFixed(2)} spend</p>
                <p className="text-foreground text-xs">{preset.queriesHint} searches, {preset.questionTarget} questions</p>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
