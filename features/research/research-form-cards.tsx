"use client";

import { LayoutList, Swords, Zap } from "lucide-react";
import { type Control, type UseFormSetValue, useWatch } from "react-hook-form";

import { Card, CardContent } from "@/components/ui/card";

import { EFFORT_PRESETS, type Effort } from "@/lib/research/budget";
import type { ReportSection } from "@/lib/research/types";

import { EffortPicker } from "@/features/research/effort-picker";
import type { ResearchFormValues } from "@/features/research/form-schema";
import { SectionLabel } from "@/features/research/report-view";
import type { Me } from "@/features/research/research-experience";
import { ceilingFor } from "@/features/research/research-form-controls";
import { RoundPicker, isCustomRound } from "@/features/research/round-picker";
import { SectionPicker } from "@/features/research/section-picker";

type SetValue = UseFormSetValue<ResearchFormValues>;

/** Every field write from the pickers wants the same flags. */
const SET: Parameters<SetValue>[2] = { shouldDirty: true, shouldValidate: true };

export function SectionsCard({
  control,
  setValue,
}: {
  control: Control<ResearchFormValues>;
  setValue: SetValue;
}) {
  const sections = useWatch({ control, name: "sections" });

  function toggleSection(section: ReportSection) {
    setValue(
      "sections",
      sections.includes(section) ? sections.filter((s) => s !== section) : [...sections, section],
      SET
    );
  }

  return (
    <Card>
      <CardContent>
        <h2 className="text-tertiary font-display text-lg font-medium capitalize flex items-center">
          <LayoutList className="mr-2 h-5 w-5 opacity-40 transition-all duration-200 hover:opacity-100 hover:drop-shadow-[0_0_8px_rgba(100,150,255,0.8)]" aria-hidden="true" />
          Report Sections
        </h2>
        <p className="text-muted-foreground font-display mt-1 text-xs">
          Drop what you already know, you are only charged for what the run researches. Predicted
          questions, the prep plan, and worth reading are always included.
        </p>
        <div className="mt-4">
          <SectionPicker selected={sections} onToggle={toggleSection} />
        </div>
      </CardContent>
    </Card>
  );
}

export function RoundsCard({
  control,
  setValue,
  error,
}: {
  control: Control<ResearchFormValues>;
  setValue: SetValue;
  error?: string;
}) {
  const rounds = useWatch({ control, name: "rounds" });

  function toggleCategory(cat: string) {
    setValue(
      "rounds",
      rounds.includes(cat) ? rounds.filter((c) => c !== cat) : [...rounds, cat],
      SET
    );
  }

  function addCustomRound(round: string) {
    if (!rounds.includes(round)) setValue("rounds", [...rounds, round], SET);
  }

  function removeCustomRound(round: string) {
    if (isCustomRound(round)) {
      setValue(
        "rounds",
        rounds.filter((c) => c !== round),
        SET
      );
    }
  }

  return (
    <Card>
      <CardContent>
        <h2 className="text-tertiary font-display text-lg font-medium capitalize flex items-center">
          <Swords className="mr-2 h-5 w-5 opacity-40 transition-all duration-200 hover:opacity-100 hover:drop-shadow-[0_0_8px_rgba(100,150,255,0.8)]" aria-hidden="true" />
          Rounds to Scout
        </h2>
        <p className="text-muted-foreground font-display mt-1 text-xs">
          You can add more rounds later, from the finished report.
        </p>
        <div className="mt-4">
          <RoundPicker
            selected={rounds}
            onToggle={toggleCategory}
            onAddCustom={addCustomRound}
            onRemoveCustom={removeCustomRound}
          />
        </div>
        {error && <p className="text-destructive font-display mt-2 text-xs">{error}</p>}
      </CardContent>
    </Card>
  );
}

export function EffortCard({
  control,
  setValue,
  credits,
}: {
  control: Control<ResearchFormValues>;
  setValue: SetValue;
  credits?: Record<Effort, number>;
}) {
  const effort = useWatch({ control, name: "effort" });

  return (
    <Card>
      <CardContent>
        <h2 className="text-tertiary font-display text-lg font-medium capitalize flex items-center">
          <Zap className="mr-2 h-5 w-5 opacity-40 transition-all duration-200 hover:opacity-100 hover:drop-shadow-[0_0_8px_rgba(100,150,255,0.8)]" aria-hidden="true" />
          Effort
        </h2>
        <p className="text-muted-foreground font-display mt-1 text-xs">
          How wide to search. Higher effort finds more questions and costs more credits.
        </p>
        <div className="mt-4">
          <EffortPicker
            value={effort}
            onChange={(level) => setValue("effort", level, SET)}
            credits={credits}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/** The plain-language restatement of the cap, next to the run button. */
export function EffortNote({
  control,
  balance,
  me,
}: {
  control: Control<ResearchFormValues>;
  balance: number;
  me: Me | null;
}) {
  const effort = useWatch({ control, name: "effort" });

  return (
    <p className="text-muted-foreground font-display text-sm font-medium leading-relaxed">
      {EFFORT_PRESETS[effort].label} effort: capped at{" "}
      <span className="text-tertiary">{Math.min(balance, ceilingFor(effort, me))}</span> credits.
      You are charged only what the run actually spends. Balance:{" "}
      <span className="text-tertiary">{balance}</span>.
    </p>
  );
}
