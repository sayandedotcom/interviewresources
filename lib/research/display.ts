import { INTERVIEW_CATEGORIES, type InterviewCategory, type PredictedQuestion } from "./types";

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

/** Copy for the badge shown on questions the pipeline inferred from proxy evidence. */
export const BASIS_META = {
  label: "Inferred",
  tooltip:
    "Predicted from proxy signals — the founders' backgrounds, comparable companies, and " +
    "stage norms — not first-hand accounts of interviewing here. See the rationale for the basis.",
} as const;

/**
 * Questions bucketed by round: predefined categories in taxonomy order, then
 * custom rounds in the order they first appear. The model can also return a
 * round the user never asked for (surfaced by loop-format discovery), so this
 * cannot assume the categories are known ones.
 *
 * The screen and the PDF share this so a report reads the same in both.
 */
export function groupByCategory(
  questions: PredictedQuestion[]
): { cat: string; questions: PredictedQuestion[] }[] {
  const present = questions.map((q) => q.category);
  const order = [
    ...INTERVIEW_CATEGORIES.filter((cat) => present.includes(cat)),
    ...present.filter(
      (cat, i) =>
        !INTERVIEW_CATEGORIES.includes(cat as InterviewCategory) && present.indexOf(cat) === i
    ),
  ];
  return order.map((cat) => ({ cat, questions: questions.filter((q) => q.category === cat) }));
}
