import type { GatheredSource } from "./types";

/**
 * Categories that carry no direct signal about interviewing at the company
 * itself: a company overview or an interviewer's public writing tells us
 * nothing about how sparse the *interview* evidence is. Everything else — the
 * loop_format query, interview_experience hunts, and the per-round discovery
 * queries — counts toward density.
 */
const NON_DIRECT_CATEGORIES = new Set(["company", "interviewer"]);

/**
 * A Tavily snippet shorter than this is usually a title echo or a nav blurb,
 * not a substantive account. Counting it as evidence would defeat the whole
 * point of the check, so the floor is deliberately above snippet noise.
 */
export const MIN_DIRECT_CONTENT_CHARS = 200;

/** Below this many direct sources, a report has too little to stand on alone. */
export const SPARSE_DIRECT_THRESHOLD = 3;

export interface EvidenceDensity {
  /** Sources in an interview-signal category with enough content to be real. */
  directSources: number;
  /** Of those, how many were full-page extracted rather than left as snippets. */
  extractedDirect: number;
  /** True when the pipeline should broaden into proxy research. */
  sparse: boolean;
}

/**
 * Measures how much direct interview evidence a gather wave produced, so the
 * pipeline can decide whether to run a second, proxy-based wave. Pure and
 * deterministic — no LLM call, no budget interaction — which keeps it cheap to
 * run on every research and trivial to test.
 */
export function assessEvidenceDensity(sources: GatheredSource[]): EvidenceDensity {
  const direct = sources.filter(
    (s) => !NON_DIRECT_CATEGORIES.has(s.category) && s.content.length >= MIN_DIRECT_CONTENT_CHARS
  );
  const directSources = direct.length;
  const extractedDirect = direct.filter((s) => s.extracted).length;

  // Either almost nothing came back, or a handful of thin snippets with not a
  // single full page behind them — both cases warrant broadening the search.
  const sparse =
    directSources < SPARSE_DIRECT_THRESHOLD || (directSources < 5 && extractedDirect === 0);

  return { directSources, extractedDirect, sparse };
}
