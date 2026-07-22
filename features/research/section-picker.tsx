"use client";

import {
  Building2,
  Compass,
  type LucideIcon,
  MessagesSquare,
  UserCheck,
  Wrench,
} from "lucide-react";

import { SECTION_META } from "@/lib/research/display";
import { REPORT_SECTIONS, type ReportSection } from "@/lib/research/types";

import { ToggleChip } from "@/features/research/toggle-chip";

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
          <ToggleChip
            key={section}
            icon={Icon}
            label={meta.label}
            blurb={meta.blurb}
            on={on}
            onClick={() => onToggle(section)}
            disabled={disabled}
          />
        );
      })}
    </div>
  );
}
