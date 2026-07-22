"use client";

import { useState } from "react";

import { AlertTriangle, ChevronUp, Clock, Coins, Gauge } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import type { Estimate } from "@/lib/research/estimate";

import { EstimateRing, overBudget } from "@/features/research/estimate-ring";

/**
 * The one sentence this whole feature exists to let us say honestly. Shown
 * everywhere an estimate is: the number is a guess, the charge is metered.
 */
const DISCLAIMER = " — you are charged what the run actually spends, which may be more or less.";

function creditRange(e: Estimate): string {
  return `${e.minCredits}–${e.maxCredits}`;
}

function minuteRange(e: Estimate): string {
  return `${e.minMinutes}–${e.maxMinutes}`;
}

/**
 * The ring plus the two numbers. `stacked` is for the narrow rail, where the
 * ring sits above the figures; everywhere else they sit side by side.
 */
function Summary({
  estimate,
  balance,
  stacked,
}: {
  estimate: Estimate;
  /** Undefined until the balance loads, or when signed out: no ring, numbers only. */
  balance?: number;
  stacked?: boolean;
}) {
  return (
    <div
      className={
        stacked ? "flex flex-col items-center gap-2 text-center" : "flex items-center gap-4"
      }>
      {balance !== undefined && (
        <Tooltip>
          <TooltipTrigger render={<span className="cursor-help" />}>
            {/* No className: EstimateRing's own default (size-20 text-sm) is the
                size we want, and it fits the 224px rail. */}
            <EstimateRing value={estimate.maxCredits} max={balance} />
          </TooltipTrigger>
          <TooltipContent>
            <span className="font-display">
              At worst this run uses {estimate.maxCredits} of your {balance} credits — the share of
              your balance shown in the ring
            </span>
          </TooltipContent>
        </Tooltip>
      )}
      <div className="space-y-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <p className="font-display text-foreground cursor-help text-3xl leading-none font-bold tracking-tight" />
            }>
            {/* The range and its unit stay in one node — the panel's tests match
                "~29–54" against this element's text. */}
            ~{creditRange(estimate)}{" "}
            <span className="text-muted-foreground block pt-1.5 text-[11px] font-medium tracking-wide uppercase">
              credits
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <span className="font-display">
              What these choices are likely to cost. Fewer rounds, fewer sections, or a lighter
              effort bring it down.
            </span>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <p className="text-muted-foreground font-display flex cursor-help items-center gap-1 text-xs" />
            }>
            <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />~{minuteRange(estimate)} min to
            generate
          </TooltipTrigger>
          <TooltipContent>
            <span className="font-display">
              Time from hitting run to a finished report. Progress streams live while it works.
            </span>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

/** What the user holds, and the wall the run cannot spend past. */
function BalanceLine({ balance, ceiling }: { balance: number; ceiling?: number }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <p className="font-display bg-muted/40 flex cursor-help flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-lg px-2.5 py-1.5 text-sm font-medium" />
        }>
        <Coins className="text-primary h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-muted-foreground">Balance:</span>
        {/* Bare on purpose: the test matches "200" exactly, so nothing else may
            share this element. */}
        <span className="text-primary font-semibold">{balance}</span>
        {ceiling !== undefined && (
          // nowrap: in the report's narrow rail this used to break between "cap"
          // and the number, stranding the figure on its own line.
          <span className="text-primary/70 font-semibold whitespace-nowrap">· cap {ceiling}</span>
        )}
      </TooltipTrigger>
      <TooltipContent>
        <span className="font-display">
          You hold {balance} credits.
          {ceiling !== undefined &&
            ` This effort hard-stops at ${ceiling}, so the run can never charge more than that.`}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

/** The promise we are careful not to make, said in the same words everywhere. */
function Disclaimer() {
  return (
    // Deliberately neutral, not brand-tinted: this is the line that lowers
    // expectations, and a blue box reads as a feature highlight.
    <p className="text-muted-foreground font-display bg-muted/60 border-border rounded-lg border px-2.5 py-2 text-xs leading-relaxed">
      <span className="text-foreground font-semibold">Estimate only</span>
      {DISCLAIMER}
    </p>
  );
}

/** The red line when the estimate's high end runs past what the user holds. */
function BudgetWarning({ estimate, balance }: { estimate: Estimate; balance: number }) {
  if (!overBudget(estimate.maxCredits, balance)) return null;
  return (
    <p className="text-status-critical font-display bg-status-critical/10 border-status-critical/30 flex gap-1.5 rounded-lg border px-2.5 py-2 text-xs leading-relaxed font-medium">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        This could cost more than your {balance} credits. The run stops when they are spent, so the
        report may come back thinner.
      </span>
    </p>
  );
}

/**
 * Live cost of the choices on the gather form. The form is a long scroll, so the
 * estimate follows the user: a sticky rail in the margin on desktop, a sticky
 * bar at the bottom of the viewport on smaller screens (tap to expand).
 */
export function EstimatePanel({
  estimate,
  balance,
  ceiling,
  controls,
  variant = "margin",
}: {
  estimate: Estimate;
  balance?: number;
  /** The effort's credit ceiling — the most this run can possibly spend. */
  ceiling?: number;
  /** Optional extra controls (e.g. the report's Effort picker) shown above the
      summary in the rail and inside the expanded bottom bar. */
  controls?: React.ReactNode;
  /**
   * How the desktop rail is placed. "margin" hangs it outside the content's
   * right edge (the original behaviour, still used by the report). "column"
   * makes it an ordinary grid item, which is what lets its container widen
   * without pushing the rail off the side of the page.
   */
  variant?: "margin" | "column";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/*
       * The rail only appears from xl; below that the sticky bottom bar takes
       * over. Either way the full-height wrapper is what gives the sticky card
       * room to travel — don't collapse it with `items-start` on the parent.
       */}
      <aside
        data-testid="estimate-rail"
        className={
          variant === "column"
            ? "hidden h-full w-full xl:block"
            : "absolute top-0 left-full ml-5 hidden h-full w-56 xl:block"
        }
        aria-label="Cost estimate">
        {/* Recolouring Card's own ring rather than adding a border: it already
            ships ring-1, and a border on top would double the hairline. The
            shadow is what says "floating rail" rather than "inline card". */}
        <Card className="ring-border sticky top-6 rounded-2xl shadow-[var(--shadow-md)]">
          <CardContent className="space-y-3">
            {/* An eyebrow, not a title — it has to yield to the credit figure,
                which is the one number this panel exists to show. */}
            <div className="mb-2">
              <h2 className="text-muted-foreground font-display flex items-center text-[11px] font-semibold tracking-[0.14em] uppercase">
                <Gauge className="text-primary mr-2 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Estimate
              </h2>
            </div>
            <Summary estimate={estimate} balance={balance} stacked />
            {balance !== undefined && (
              <>
                <BalanceLine balance={balance} ceiling={ceiling} />
                <BudgetWarning estimate={estimate} balance={balance} />
              </>
            )}
            <Disclaimer />
            {controls && (
              <>
                <Separator />
                {controls}
              </>
            )}
          </CardContent>
        </Card>
      </aside>

      {/* Everywhere the rail doesn't fit: a slim bar pinned to the bottom of the
          viewport, expanding to the same detail on tap. The safe-area padding
          matters here specifically — this sits where an iPhone's home indicator
          is. */}
      <div
        data-testid="estimate-bar"
        className="bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur xl:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left">
          <span className="font-display text-foreground flex items-center gap-2 text-sm">
            <Gauge className="text-primary h-4 w-4" aria-hidden="true" />
            <span className="text-base font-bold tracking-tight">
              ~{creditRange(estimate)} credits
            </span>
            <span className="text-muted-foreground text-xs">· ~{minuteRange(estimate)} min</span>
          </span>
          <ChevronUp
            className={`text-muted-foreground h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
        {open && (
          <div className="space-y-3 px-5 pb-3">
            <Summary estimate={estimate} balance={balance} />
            {balance !== undefined && (
              <>
                <BalanceLine balance={balance} ceiling={ceiling} />
                <BudgetWarning estimate={estimate} balance={balance} />
              </>
            )}
            <Disclaimer />
            {controls && (
              <>
                <Separator />
                {controls}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
