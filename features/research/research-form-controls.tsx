"use client";

import { useState } from "react";

import { RefreshCw, RotateCcw } from "lucide-react";
import { type Control, useWatch } from "react-hook-form";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { EFFORT_PRESETS, type Effort } from "@/lib/research/budget";
import { estimateRun } from "@/lib/research/estimate";

import { EstimatePanel } from "@/features/research/estimate-panel";
import { type ResearchFormValues, isDraftDirty } from "@/features/research/form-schema";
import type { Me } from "@/features/research/research-experience";

/** The picked effort's credit ceiling. The server is the source of truth; this
 * mirrors it so the form can quote a number it knows the run cannot exceed. */
export function ceilingFor(effort: Effort, me: Me | null): number {
  return me?.effortCredits?.[effort] ?? me?.maxRunCredits ?? 130;
}

/**
 * The estimate moves with every keystroke, which is the whole point — but only
 * this subtree needs to. Subscribing here instead of in the parent keeps typing
 * from re-rendering the entire form. The math is a cheap pure function; the
 * charge is metered from real usage, never from this.
 */
export function LiveEstimate({
  control,
  balance,
  me,
  variant,
}: {
  control: Control<ResearchFormValues>;
  balance?: number;
  me: Me | null;
  variant?: "margin" | "column";
}) {
  const [effort, rounds, sections, interviewers, jobDescription, companyUrl] = useWatch({
    control,
    name: ["effort", "rounds", "sections", "interviewers", "jobDescription", "companyUrl"],
  });

  const ceiling = ceilingFor(effort, me);
  const estimate = estimateRun(
    {
      effort,
      roundsCount: rounds.length,
      sectionsCount: sections.length,
      interviewersCount: interviewers.filter((i) => i.name.trim()).length,
      jobDescriptionLength: jobDescription.length,
      hasCompanyUrl: Boolean(companyUrl.trim()),
    },
    ceiling
  );

  return (
    <EstimatePanel estimate={estimate} balance={balance} ceiling={ceiling} variant={variant} />
  );
}

/** Appears once any field diverges from the pristine defaults — so it has to
 * watch all of them, which is exactly why it lives in its own component. */
export function ClearFormButton({
  control,
  onClear,
}: {
  control: Control<ResearchFormValues>;
  onClear: () => void;
}) {
  const values = useWatch({ control }) as ResearchFormValues;
  if (!isDraftDirty(values)) return null;

  return (
    <AlertDialog>
      <Tooltip>
        <AlertDialogTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground -mt-1 -mr-2"
            />
          }>
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="font-display">Clear form</span>
        </AlertDialogTrigger>
        <TooltipContent>
          <span className="font-display">Reset all fields to empty</span>
        </TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear form?</AlertDialogTitle>
          <AlertDialogDescription>
            This will reset all fields to empty. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onClear}>Clear</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * A run spends real credits, so the confirmation quotes the same numbers the
 * estimate rail does. It watches every field that feeds the estimate, which is
 * why it is its own component: the dialog content only mounts while the dialog
 * is open, so those subscriptions cost nothing while the user is still typing.
 */
function RunConfirmDescription({
  control,
  company,
  me,
}: {
  control: Control<ResearchFormValues>;
  company: string;
  me: Me | null;
}) {
  const [effort, rounds, sections, interviewers, jobDescription, companyUrl] = useWatch({
    control,
    name: ["effort", "rounds", "sections", "interviewers", "jobDescription", "companyUrl"],
  });

  const ceiling = ceilingFor(effort, me);
  const estimate = estimateRun(
    {
      effort,
      roundsCount: rounds.length,
      sectionsCount: sections.length,
      interviewersCount: interviewers.filter((i) => i.name.trim()).length,
      jobDescriptionLength: jobDescription.length,
      hasCompanyUrl: Boolean(companyUrl.trim()),
    },
    ceiling
  );

  return (
    <AlertDialogDescription>
      This runs a {EFFORT_PRESETS[effort].label.toLowerCase()}-effort reconnaissance on{" "}
      <span className="text-foreground font-medium">{company.trim()}</span>, using an estimated{" "}
      {estimate.minCredits}–{estimate.maxCredits} credits and capped at {ceiling}. You are charged
      for what the run actually spends, never the estimate.
    </AlertDialogDescription>
  );
}

/** Owns its own `company` subscription so typing a company name re-renders the
 * button, not the form around it. */
export function RunButton({
  control,
  me,
  onConfirm,
}: {
  control: Control<ResearchFormValues>;
  me: Me | null;
  onConfirm: () => void;
}) {
  const [company, rounds] = useWatch({ control, name: ["company", "rounds"] });
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            size="lg"
            variant="glossy"
            disabled={!company.trim() || rounds.length === 0}
          />
        }>
        Run reconnaissance <RefreshCw className="ml-1 inline size-4" aria-hidden="true" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Start reconnaissance?</AlertDialogTitle>
          <RunConfirmDescription control={control} company={company} me={me} />
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="tertiary"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}>
            Run
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
