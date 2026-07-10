import { z } from "zod";

import { EFFORT_LEVELS } from "./budget";

/** Interview categories the pipeline knows how to research. See PRD §5.3. */
export const INTERVIEW_CATEGORIES = [
  "dsa",
  "system_design",
  "domain_quiz",
  "take_home",
  "pair_programming",
  "behavioral",
  "hr_culture",
] as const;

export type InterviewCategory = (typeof INTERVIEW_CATEGORIES)[number];

/**
 * Ceilings on caller-supplied free text. Every field below is interpolated into
 * the synthesize prompt, which is billed per input token on the priciest model,
 * and the BudgetTracker cannot help: it prices a call only after that call has
 * returned. So the bound has to live here, at the edge, not in the pipeline.
 *
 * They are set well above what the form can realistically produce — they exist
 * to stop a crafted request, not to discipline a real one.
 */
export const MAX_COMPANY_NAME = 120;
export const MAX_URL = 500;
export const MAX_YEARS_EXPERIENCE = 50;
export const MAX_TECH_STACK = 500;
export const MAX_ROLE_CONTEXT = 500;
export const MAX_INTERVIEWERS = 5;
export const MAX_INTERVIEW_TYPES = 12;
export const MAX_INTERVIEW_TYPE_LEN = 80;

/**
 * Extensions feed every question the report already holds back into synthesis as
 * a do-not-repeat list. Note this bound only covers POST /api/research: the
 * extend route builds the list from the stored report and calls the pipeline
 * directly, so its prompt still grows with each extension.
 */
export const MAX_EXCLUDE_QUESTIONS = 200;
export const MAX_EXCLUDE_QUESTION_LEN = 500;

export const interviewerSchema = z.object({
  name: z.string().min(1).max(MAX_COMPANY_NAME),
  url: z.string().url().max(MAX_URL).optional(),
});

export type Interviewer = z.infer<typeof interviewerSchema>;

export const researchInputSchema = z.object({
  companyName: z.string().min(1).max(MAX_COMPANY_NAME),
  companyUrl: z.string().url().max(MAX_URL).optional(),
  // Deliberately uncapped: describeInput truncates it to 2000 chars, so its
  // contribution to the prompt is already bounded, and rejecting a pasted job
  // posting for being long would be a worse trade than ignoring its tail.
  jobDescription: z.string().optional(),
  yearsExperience: z.string().max(MAX_YEARS_EXPERIENCE).optional(),
  techStack: z.string().max(MAX_TECH_STACK).optional(),
  interviewers: z.array(interviewerSchema).max(MAX_INTERVIEWERS).default([]),
  /** Predefined categories plus any custom round identifiers the user added. */
  interviewTypes: z
    .array(z.string().min(1).max(MAX_INTERVIEW_TYPE_LEN))
    .min(1)
    .max(MAX_INTERVIEW_TYPES),
  roleContext: z.string().max(MAX_ROLE_CONTEXT).optional(),
  fullLoop: z.boolean().default(false),
  /** Question text already predicted by an earlier pass, which synthesis must not repeat. */
  excludeQuestions: z
    .array(z.string().max(MAX_EXCLUDE_QUESTION_LEN))
    .max(MAX_EXCLUDE_QUESTIONS)
    .default([]),
  /** How wide to search and how many questions to produce. See EFFORT_PRESETS. */
  effort: z.enum(EFFORT_LEVELS).default("medium"),
});

export type ResearchInput = z.infer<typeof researchInputSchema>;

/** Stage 1 output: the search plan. */
export const researchPlanSchema = z.object({
  resolvedCompanyDomain: z
    .string()
    .describe("Best-guess primary domain for the company, e.g. stripe.com"),
  companySummaryQuery: z.string(),
  queries: z
    .array(
      z.object({
        query: z.string(),
        purpose: z.string().describe("Why this query — which evidence it targets"),
        depth: z.enum(["basic", "advanced"]),
        category: z
          .string()
          .describe(
            'One of the round identifiers supplied in the prompt, or "company", "interviewer", or "loop_format"'
          ),
      })
    )
    .min(3)
    // High effort plans up to 12 queries.
    .max(12),
});

export type ResearchPlan = z.infer<typeof researchPlanSchema>;

/** Stage 3 output: one compressed note per source. */
export interface CompressedNote {
  sourceUrl: string;
  sourceTitle: string;
  category: string;
  summary: string;
}

/** Stage 4 output: the final report, per PRD §5.2 / §5.3. */
export const questionSchema = z.object({
  category: z
    .string()
    .describe("Exactly one of the round identifiers supplied in the prompt — copied verbatim"),
  question: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  rationale: z.string().describe("Why we predict this — grounded in evidence, not vibes"),
  prepNote: z.string().describe("What a strong answer covers"),
  evidenceUrls: z.array(z.string()),
});

export type PredictedQuestion = z.infer<typeof questionSchema>;

export const importantLinkSchema = z.object({
  title: z.string(),
  url: z.string(),
  why: z.string().describe("One sentence: why this is worth the candidate's time"),
});

export type ImportantLink = z.infer<typeof importantLinkSchema>;

export const reportSchema = z.object({
  companySnapshot: z.string().describe("What the company does, stack, scale signals"),
  companyExplainer: z
    .string()
    .describe(
      "The company explained in plain, jargon-free language, ending with one concrete " +
        "everyday example of the product in action"
    ),
  likelyLoopStructure: z
    .string()
    .describe("The reported interview process/rounds for this company, if discoverable"),
  interviewerSummary: z.string().nullable().describe("Null if no interviewer was provided"),
  questions: z.array(questionSchema).min(1),
  prepPlan: z.array(z.string()).describe("Ordered list of prep priorities"),
  importantLinks: z
    .array(importantLinkSchema)
    .describe("3-6 most valuable sources for the candidate to read, chosen from the evidence URLs"),
});

export type Report = z.infer<typeof reportSchema>;

export interface PipelineProgressEvent {
  stage: "plan" | "gather" | "compress" | "synthesize" | "done" | "error";
  message: string;
  at: string;
}
