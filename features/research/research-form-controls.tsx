"use client";

import { RotateCcw } from "lucide-react";
import { type Control, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import type { Effort } from "@/lib/research/budget";
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
}: {
  control: Control<ResearchFormValues>;
  balance?: number;
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

  return <EstimatePanel estimate={estimate} balance={balance} ceiling={ceiling} />;
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-muted-foreground hover:text-foreground -mt-1 -mr-2"
            />
          }>
          <RotateCcw className="h-3.5 w-3.5" />
          Clear form
        </TooltipTrigger>
        <TooltipContent>
          <span className="font-display">Reset all fields to empty</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Owns its own `company` subscription so typing a company name re-renders the
 * button, not the form around it. */
export function RunButton({ control }: { control: Control<ResearchFormValues> }) {
  const [company, rounds] = useWatch({ control, name: ["company", "rounds"] });

  return (
    <Button type="submit" size="lg" disabled={!company.trim() || rounds.length === 0}>
      Run reconnaissance →
    </Button>
  );
}
