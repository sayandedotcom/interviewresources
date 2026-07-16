"use client";

import {
  Building2,
  Compass,
  type LucideIcon,
  MessagesSquare,
  UserCheck,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { SECTION_META } from "@/lib/research/display";
import { REPORT_SECTIONS, type ReportSection } from "@/lib/research/types";

/** Each chip wears the icon its section wears in the report, so the two read as one thing. */
const SECTION_ICON: Record<ReportSection, LucideIcon> = {
  company: Building2,
  loop: Compass,
  skills: Wrench,
  experiences: MessagesSquare,
  recruiter: UserCheck,
};

/**
 * The "Report sections" chips: the parts of a report a candidate can decline
 * before spending credits on them. Deselecting is the whole point — a report on
 * a household-name company rarely needs the company overview researched.
 */
export function SectionPicker({
  selected,
  onToggle,
  disabled = false,
  options = REPORT_SECTIONS,
}: {
  selected: ReportSection[];
  onToggle: (section: ReportSection) => void;
  disabled?: boolean;
  /** Which sections to offer. Defaults to all; the report page passes only the
      sections missing from the finished report. */
  options?: readonly ReportSection[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((section) => {
        const on = selected.includes(section);
        const meta = SECTION_META[section];
        const Icon = SECTION_ICON[section];
        return (
          <Tooltip key={section}>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size="lg"
                  variant={on ? "default" : "outline"}
                  onClick={() => onToggle(section)}
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
    </div>
  );
}
