import type { InterviewCategory } from "./types";

/** UI-facing labels and short codes for each interview category (PRD §5.3). */
export const CATEGORY_META: Record<
  InterviewCategory,
  { label: string; code: string; blurb: string }
> = {
  dsa: { label: "Algorithmic Coding", code: "DSA", blurb: "Data structures & algorithms" },
  system_design: { label: "System Design", code: "SYS", blurb: "Scalability & architecture" },
  domain_quiz: { label: "Domain Quiz", code: "DOM", blurb: "Stack-specific technical Q&A" },
  take_home: { label: "Take-home Project", code: "TKH", blurb: "Assignment & rubric" },
  pair_programming: { label: "Pair Programming", code: "PAIR", blurb: "Live collaborative coding" },
  behavioral: { label: "Behavioral", code: "BEH", blurb: "Values & past experience" },
  hr_culture: { label: "HR / Culture", code: "HR", blurb: "Recruiter screen & fit" },
};

function isKnown(cat: string): cat is InterviewCategory {
  // hasOwn, not `in`: custom rounds are user-supplied, and `"toString" in
  // CATEGORY_META` is true via the prototype chain.
  return Object.hasOwn(CATEGORY_META, cat);
}

/** Custom rounds arrive as free-form identifiers like `live_debugging`. */
export function categoryLabel(cat: string): string {
  if (isKnown(cat)) return CATEGORY_META[cat].label;
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function categoryCode(cat: string): string {
  if (isKnown(cat)) return CATEGORY_META[cat].code;
  return (
    cat
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 4)
      .toUpperCase() || "RND"
  );
}

export const CONFIDENCE_META: Record<
  "high" | "medium" | "low",
  { label: string; signal: "●●●" | "●●○" | "●○○" }
> = {
  high: { label: "High", signal: "●●●" },
  medium: { label: "Medium", signal: "●●○" },
  low: { label: "Low", signal: "●○○" },
};
