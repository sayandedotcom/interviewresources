"use client";

import { useState } from "react";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { CATEGORY_META, categoryLabel } from "@/lib/research/display";
import { INTERVIEW_CATEGORIES, type InterviewCategory } from "@/lib/research/types";

export function isCustomRound(round: string): boolean {
  return !INTERVIEW_CATEGORIES.includes(round as InterviewCategory);
}

/**
 * The "Rounds to scout" chips, shared by the main form and the extend footer
 * under a finished report. `exclude` hides rounds the report already covers.
 */
export function RoundPicker({
  selected,
  onToggle,
  onAddCustom,
  onRemoveCustom,
  exclude = [],
  disabled = false,
}: {
  selected: string[];
  onToggle: (cat: string) => void;
  onAddCustom: (round: string) => void;
  onRemoveCustom: (round: string) => void;
  exclude?: string[];
  disabled?: boolean;
}) {
  const [customRound, setCustomRound] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  function submitCustom() {
    const trimmed = customRound.trim().toLowerCase().replace(/\s+/g, "_");
    if (trimmed) onAddCustom(trimmed);
    setCustomRound("");
  }

  const predefined = INTERVIEW_CATEGORIES.filter((cat) => !exclude.includes(cat));

  return (
    <div className="flex flex-wrap gap-2">
      {predefined.map((cat) => {
        const on = selected.includes(cat);
        const meta = CATEGORY_META[cat];
        return (
          <Tooltip key={cat}>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size="lg"
                  variant={on ? "default" : "outline"}
                  onClick={() => onToggle(cat)}
                  aria-pressed={on}
                  disabled={disabled}
                />
              }>
              <span className="font-mono text-[10px] tracking-widest opacity-70">
                {meta.code}
              </span>
              <span className="font-display">{meta.label}</span>
            </TooltipTrigger>
            <TooltipContent>
              <span className="font-display">{meta.blurb}</span>
            </TooltipContent>
          </Tooltip>
        );
      })}

      {selected.filter(isCustomRound).map((custom) => (
        <Button
          type="button"
          key={custom}
          size="lg"
          variant="default"
          onClick={() => onRemoveCustom(custom)}
          title="Click to remove"
          disabled={disabled}>
          <span className="font-display">{categoryLabel(custom)}</span>
          <X className="ml-1 h-4 w-4" />
        </Button>
      ))}

      {showCustomInput ? (
        <div className="flex items-center gap-2">
          <Input
            value={customRound}
            onChange={(e) => setCustomRound(e.target.value)}
            placeholder="Custom round name"
            className="h-9 w-40"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitCustom();
              }
            }}
          />
          <Button type="button" size="sm" onClick={submitCustom} disabled={disabled}>
            Add
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowCustomInput(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setShowCustomInput(true)}
                disabled={disabled}
              />
            }>
            <Plus className="mr-1 h-4 w-4" />
            Add round
          </TooltipTrigger>
          <TooltipContent>
            <span className="font-display">Add a custom round type</span>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
