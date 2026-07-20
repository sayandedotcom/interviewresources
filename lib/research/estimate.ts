/**
 * Pre-flight cost and duration estimate for a run, so the form can price the
 * user's choices *before* they spend anything. Everything here is advisory: the
 * money that actually gets charged is metered from real token usage
 * (BudgetTracker), never from these numbers.
 *
 * The model mirrors the pipeline's shape — plan (flash-lite) → gather (Tavily)
 * → compress per source (flash-lite) → synthesize (pro) — priced with the same
 * GEMINI_PRICES and effort presets the run itself uses, so tuning an effort
 * preset moves the estimate with it. The per-call token constants below are the
 * only guesswork, and they are what to re-tune when the prompts change.
 */
import { usdToCredits } from "@/lib/pricing";

import {
  EFFORT_PRESETS,
  type Effort,
  GEMINI_PRICES,
  type GeminiModel,
  TAVILY_CREDIT_COST_USD,
} from "./budget";

const PLAN_MODEL: GeminiModel = "gemini-3.1-flash-lite-preview";
const COMPRESS_MODEL: GeminiModel = "gemini-3.1-flash-lite-preview";
const SYNTH_MODEL: GeminiModel = "gemini-3.1-pro-preview";

/** Typical token counts per call, calibrated so a default medium run lands near
 * the ~$0.35 a real one costs (see lib/credits.ts). Re-tune with the prompts. */
const PLAN_INPUT_TOKENS = 1_200;
const PLAN_OUTPUT_TOKENS = 500;
const COMPRESS_INPUT_TOKENS_PER_SOURCE = 6_000;
const COMPRESS_OUTPUT_TOKENS_PER_SOURCE = 500;
const SYNTH_BASE_INPUT_TOKENS = 3_000;
const SYNTH_TOKENS_PER_QUESTION = 320;
const SYNTH_TOKENS_PER_SECTION = 600;

/** The form's default selection, which the effort presets are already tuned for.
 * Workload scales relative to this, so a default run estimates at exactly the
 * preset's own baseline. */
const BASELINE_ROUNDS = 2;
const BASELINE_SECTIONS = 4;

/** How much one extra round or section widens the search. */
const ROUND_WEIGHT = 0.2;
const SECTION_WEIGHT = 0.05;
/** Each named interviewer costs roughly this many extra searches. */
const QUERIES_PER_INTERVIEWER = 1.5;
/** A company URL is one more page to pull down. */
const COMPANY_URL_EXTRACTS = 1;

/** Compressing every search hit would be unbounded; the pipeline dedupes hard. */
const MAX_SOURCES = 40;

/**
 * The point estimate is a midpoint, not a promise. The low end assumes a clean
 * run; the high end covers the proxy "broaden" wave that fires when direct
 * evidence is sparse, plus retries. Actual runs land inside this most of the time.
 */
const RANGE_LOW = 0.8;
const RANGE_HIGH = 1.5;

/** Roughly 4 characters per token — good enough for sizing a pasted JD. */
const CHARS_PER_TOKEN = 4;

/** An extension only researches new rounds and merges them in, so it skips most
 * of the report: one section's worth of output, and fewer questions. */
const EXTEND_QUESTION_SCALE = 0.5;
const EXTEND_SECTIONS = 1;

/** Wall-clock model. Gather runs 4-wide, so queries are cheaper than they look. */
const SETUP_SECONDS = 40;
const SECONDS_PER_QUERY = 8;
const SECONDS_PER_SOURCE = 2;
const SECONDS_PER_QUESTION = 1.5;

export interface EstimateInput {
  effort: Effort;
  roundsCount: number;
  sectionsCount: number;
  interviewersCount: number;
  jobDescriptionLength: number;
  hasCompanyUrl: boolean;
}

export interface Estimate {
  minCredits: number;
  maxCredits: number;
  minMinutes: number;
  maxMinutes: number;
}

/** Midpoint of a preset's "4-8" style hint. Falls back to a single number. */
export function hintMidpoint(hint: string): number {
  const parts = hint.split("-").map((p) => Number(p.trim()));
  const nums = parts.filter((n) => Number.isFinite(n));
  if (nums.length === 0) return 0;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function llmUsd(model: GeminiModel, inputTokens: number, outputTokens: number): number {
  const price = GEMINI_PRICES[model];
  return (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/**
 * The shared core: how much work a given selection implies, in dollars and
 * seconds. Both a fresh run and an extension are the same pipeline, just with
 * different scope, so they differ only in the scale factors passed in.
 */
function model(
  input: EstimateInput,
  scope: { questionScale: number; sectionsCount: number }
): { usd: number; seconds: number } {
  const preset = EFFORT_PRESETS[input.effort];

  const workload =
    (1 + ROUND_WEIGHT * (input.roundsCount - BASELINE_ROUNDS)) *
    (1 + SECTION_WEIGHT * (scope.sectionsCount - BASELINE_SECTIONS));

  const queries = Math.max(
    1,
    Math.round(
      hintMidpoint(preset.queriesHint) * Math.max(workload, 0.4) +
        QUERIES_PER_INTERVIEWER * input.interviewersCount
    )
  );

  const sources = Math.min(queries * preset.searchResults, MAX_SOURCES);
  const extractCredits =
    Math.ceil(preset.extractLimit / 5) + (input.hasCompanyUrl ? COMPANY_URL_EXTRACTS : 0);
  const searchUsd = TAVILY_CREDIT_COST_USD * (queries + extractCredits);

  const jdTokens = Math.ceil(input.jobDescriptionLength / CHARS_PER_TOKEN);

  // More rounds means more ground for the same question budget to cover, but the
  // synthesize prompt asks for a fixed range, so the count only drifts with it.
  const roundsScale = clamp(1 + 0.12 * (input.roundsCount - BASELINE_ROUNDS), 0.8, 1.7);
  const questions = hintMidpoint(preset.questionTarget) * roundsScale * scope.questionScale;

  const planUsd = llmUsd(PLAN_MODEL, PLAN_INPUT_TOKENS + jdTokens, PLAN_OUTPUT_TOKENS);
  const compressUsd =
    sources *
    llmUsd(COMPRESS_MODEL, COMPRESS_INPUT_TOKENS_PER_SOURCE, COMPRESS_OUTPUT_TOKENS_PER_SOURCE);
  const synthInput =
    sources * COMPRESS_OUTPUT_TOKENS_PER_SOURCE + SYNTH_BASE_INPUT_TOKENS + jdTokens;
  const synthOutput =
    questions * SYNTH_TOKENS_PER_QUESTION + scope.sectionsCount * SYNTH_TOKENS_PER_SECTION;
  const synthUsd = llmUsd(SYNTH_MODEL, synthInput, synthOutput);

  const seconds =
    SETUP_SECONDS +
    queries * SECONDS_PER_QUERY +
    sources * SECONDS_PER_SOURCE +
    questions * SECONDS_PER_QUESTION;

  return { usd: planUsd + searchUsd + compressUsd + synthUsd, seconds };
}

/**
 * Turns the raw model output into what the UI shows. The credit ceiling is a
 * real wall — the pipeline hard-stops at the effort's cap — so the high end is
 * clamped to it rather than being allowed to promise a cost the run cannot
 * reach. The low end is not floored at MIN_RUN_CREDITS: that is the balance
 * needed to *start* a run, not a minimum charge, and a cheap run really can
 * come in under it.
 */
function toEstimate(
  { usd, seconds }: { usd: number; seconds: number },
  ceilingCredits: number
): Estimate {
  const minCredits = clamp(usdToCredits(usd * RANGE_LOW), 1, ceilingCredits);
  const maxCredits = clamp(usdToCredits(usd * RANGE_HIGH), minCredits, ceilingCredits);

  const minMinutes = Math.max(1, Math.floor((seconds * RANGE_LOW) / 60));
  const maxMinutes = Math.max(minMinutes + 1, Math.ceil((seconds * RANGE_HIGH) / 60));

  return { minCredits, maxCredits, minMinutes, maxMinutes };
}

/** What a fresh run off the gather form is likely to cost and how long it takes. */
export function estimateRun(input: EstimateInput, ceilingCredits: number): Estimate {
  return toEstimate(
    model(input, { questionScale: 1, sectionsCount: input.sectionsCount }),
    ceilingCredits
  );
}

/**
 * What "Gather more rounds" is likely to cost. An extension reuses the pipeline
 * against a report that already exists, so it carries none of the form's
 * context — only the rounds asked for and the effort.
 */
export function estimateExtend(
  roundsCount: number,
  effort: Effort,
  ceilingCredits: number
): Estimate {
  const input: EstimateInput = {
    effort,
    roundsCount,
    sectionsCount: EXTEND_SECTIONS,
    interviewersCount: 0,
    jobDescriptionLength: 0,
    hasCompanyUrl: false,
  };
  return toEstimate(
    model(input, { questionScale: EXTEND_QUESTION_SCALE, sectionsCount: EXTEND_SECTIONS }),
    ceilingCredits
  );
}
