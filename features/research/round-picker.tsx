"use client";

import { useState } from "react";

import {
  Brain,
  Building2,
  Handshake,
  Hash,
  Home,
  type LucideIcon,
  MessageCircle,
  Plus,
  Puzzle,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { CATEGORY_META, categoryLabel } from "@/lib/research/display";
import { INTERVIEW_CATEGORIES, type InterviewCategory } from "@/lib/research/types";

const CATEGORY_ICON: Record<InterviewCategory, LucideIcon> = {
  dsa: Puzzle,
  system_design: Building2,
  domain_quiz: Brain,
  take_home: Home,
  pair_programming: Users,
  behavioral: MessageCircle,
  hr_culture: Handshake,
};

function isKnownCategory(cat: string): cat is InterviewCategory {
  return Object.hasOwn(CATEGORY_ICON, cat);
}

/** Custom rounds have no dedicated icon, so they fall back to a generic marker. */
export function categoryIcon(cat: string): LucideIcon {
  return isKnownCategory(cat) ? CATEGORY_ICON[cat] : Hash;
}

export function isCustomRound(round: string): boolean {
  return !INTERVIEW_CATEGORIES.includes(round as InterviewCategory);
}

/**
 * The "Rounds to gather" chips, shared by the main form and the extend footer
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
        const Icon = CATEGORY_ICON[cat];
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
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-mono text-[10px] tracking-widest opacity-70">{meta.code}</span>
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
