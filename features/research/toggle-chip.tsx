"use client";

import { Check, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Selected state is a brand tint rather than a solid fill. A page can have a
 * dozen chips switched on at once, and solid fills turn into slabs of colour
 * that outshout the submit button — the loudest thing on the form should be the
 * action, not the state.
 */
export const chipOn =
  "border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary";
export const chipOff = "hover:border-primary/40";

/**
 * A shared round/section toggle. Both pickers rendered the same icon + label +
 * tooltip trio; this is that, with the selection styling in one place.
 */
export function ToggleChip({
  icon: Icon,
  label,
  blurb,
  on,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  blurb: string;
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={onClick}
            aria-pressed={on}
            disabled={disabled}
            className={on ? chipOn : chipOff}
          />
        }>
        {on && <Check className="h-4 w-4 shrink-0" strokeWidth={2.75} aria-hidden="true" />}
        <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
        <span className="font-display">{label}</span>
      </TooltipTrigger>
      <TooltipContent>
        <span className="font-display">{blurb}</span>
      </TooltipContent>
    </Tooltip>
  );
}
