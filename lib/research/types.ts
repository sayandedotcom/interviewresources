import { z } from "zod";

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

export const interviewerSchema = z.object({
  name: z.string().min(1),
  url: z.string().url().optional(),
});

export type Interviewer = z.infer<typeof interviewerSchema>;

export const researchInputSchema = z.object({
  companyName: z.string().min(1),
  companyUrl: z.string().url().optional(),
  jobDescription: z.string().optional(),
  yearsExperience: z.string().optional(),
  techStack: z.string().optional(),
  interviewers: z.array(interviewerSchema).default([]),
  /** Predefined categories plus any custom round identifiers the user added. */
  interviewTypes: z.array(z.string().min(1)).min(1),
  roleContext: z.string().optional(),
  fullLoop: z.boolean().default(false),
});

export type ResearchInput = z.infer<typeof researchInputSchema>;

/** Stage 1 output: the search plan. */
export const researchPlanSchema = z.object({
  resolvedCompanyDomain: z.string().describe("Best-guess primary domain for the company, e.g. stripe.com"),
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
            'One of the round identifiers supplied in the prompt, or "company", "interviewer", or "loop_format"',
          ),
      }),
    )
    .min(3)
    .max(10),
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

export const reportSchema = z.object({
  companySnapshot: z.string().describe("What the company does, stack, scale signals"),
  likelyLoopStructure: z
    .string()
    .describe("The reported interview process/rounds for this company, if discoverable"),
  interviewerSummary: z.string().nullable().describe("Null if no interviewer was provided"),
  questions: z.array(questionSchema).min(1),
  prepPlan: z.array(z.string()).describe("Ordered list of prep priorities"),
});

export type Report = z.infer<typeof reportSchema>;

export interface PipelineProgressEvent {
  stage: "plan" | "gather" | "compress" | "synthesize" | "done" | "error";
  message: string;
  at: string;
}
