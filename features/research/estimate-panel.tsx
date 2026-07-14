"use client";

import { useState } from "react";

import { AlertTriangle, ChevronUp, Clock, Coins, Gauge } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
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
            <EstimateRing value={estimate.maxCredits} max={balance} className="size-16 text-xs" />
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
              <p className="font-display text-foreground cursor-help text-lg leading-none font-semibold" />
            }>
            ~{creditRange(estimate)}{" "}
            <span className="text-muted-foreground text-xs font-normal">credits</span>
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
          <p className="font-display flex cursor-help items-center gap-1.5 text-sm font-medium" />
        }>
        <Coins className="text-tertiary h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-muted-foreground">Balance:</span>
        <span className="text-tertiary font-semibold">{balance}</span>
        {ceiling !== undefined && (
          <span className="text-tertiary/70 font-semibold">· cap {ceiling}</span>
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
    <p className="text-muted-foreground font-display bg-tertiary/5 rounded-md px-2.5 py-2 text-xs leading-relaxed font-medium">
      <span className="text-tertiary font-semibold">Estimate only</span>
      {DISCLAIMER}
    </p>
  );
}

/** The red line when the estimate's high end runs past what the user holds. */
function BudgetWarning({ estimate, balance }: { estimate: Estimate; balance: number }) {
  if (!overBudget(estimate.maxCredits, balance)) return null;
  return (
    <p className="text-status-critical font-display flex gap-1.5 text-xs leading-relaxed font-medium">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        This could cost more than your {balance} credits. The run stops when they are spent, so the
        report may come back thinner.
      </span>
    </p>
  );
}

/**
 * Live cost of the choices on the scout form. The form is a long scroll, so the
 * estimate follows the user: a sticky rail in the margin on desktop, a sticky
 * bar at the bottom of the viewport on smaller screens (tap to expand).
 */
export function EstimatePanel({
  estimate,
  balance,
  ceiling,
}: {
  estimate: Estimate;
  balance?: number;
  /** The effort's credit ceiling — the most this run can possibly spend. */
  ceiling?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/*
       * The rail hangs in the page's right margin (absolute, off the form's right
       * edge) instead of taking a grid column, so the form stays exactly where it
       * was — aligned with everything else on the page. It only appears from xl,
       * the first width where the margin is genuinely wide enough to hold it
       * without pushing the page sideways; below that the bottom bar takes over.
       * The full-height wrapper is what gives the sticky card room to travel.
       */}
      <aside
        data-testid="estimate-rail"
        className="absolute top-0 left-full ml-5 hidden h-full w-56 xl:block"
        aria-label="Cost estimate">
        <Card className="sticky top-6">
          <CardContent className="space-y-3">
            {/* The label is a heading, not a row of the stack — it wants more air
                under it than the card's rhythm gives the rest. */}
            <div className="mb-2">
              <h2 className="text-tertiary font-display text-lg font-medium capitalize flex items-center">
                <Gauge className="mr-2 h-5 w-5 opacity-40 transition-all duration-200 hover:opacity-100 hover:drop-shadow-[0_0_8px_rgba(100,150,255,0.8)]" aria-hidden="true" />
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
          </CardContent>
        </Card>
      </aside>

      {/* Everywhere the rail doesn't fit: a slim bar pinned to the bottom of the
          viewport, expanding to the same detail on tap. */}
      <div
        data-testid="estimate-bar"
        className="bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur xl:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 px-5 py-2.5 text-left">
          <span className="font-display text-foreground flex items-center gap-2 text-sm">
            <Gauge className="text-tertiary h-4 w-4" aria-hidden="true" />
            <span className="font-semibold">~{creditRange(estimate)} credits</span>
            <span className="text-muted-foreground text-xs">· ~{minuteRange(estimate)} min</span>
          </span>
          <ChevronUp
            className={`text-muted-foreground h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
        {open && (
          <div className="space-y-2.5 px-5 pb-3">
            <Summary estimate={estimate} balance={balance} />
            {balance !== undefined && (
              <>
                <BalanceLine balance={balance} ceiling={ceiling} />
                <BudgetWarning estimate={estimate} balance={balance} />
              </>
            )}
            <Disclaimer />
          </div>
        )}
      </div>
    </>
  );
}

/**
 * The same estimate, sized for the report's "Scout more rounds" footer, where
 * it sits inline above the button rather than following the scroll.
 */
export function EstimateInline({
  estimate,
  balance,
  ceiling,
}: {
  estimate: Estimate;
  balance?: number;
  /** The extension's credit ceiling for the chosen effort. */
  ceiling?: number;
}) {
  return (
    <div data-testid="estimate-inline" className="bg-muted/50 space-y-2.5 rounded-lg border p-3">
      <Summary estimate={estimate} balance={balance} />
      {balance !== undefined && (
        <>
          <BalanceLine balance={balance} ceiling={ceiling} />
          <BudgetWarning estimate={estimate} balance={balance} />
        </>
      )}
      <Disclaimer />
    </div>
  );
}
