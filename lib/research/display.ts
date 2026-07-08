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

export const CONFIDENCE_META: Record<
  "high" | "medium" | "low",
  { label: string; signal: "●●●" | "●●○" | "●○○" }
> = {
  high: { label: "High", signal: "●●●" },
  medium: { label: "Medium", signal: "●●○" },
  low: { label: "Low", signal: "●○○" },
};
