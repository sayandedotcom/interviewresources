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
 * The report sections a caller can switch off. Questions, prep plan, worth
 * reading, and the interviewer summary are always produced — the rest cost real
 * search and synthesis budget a candidate may not want to spend (the company
 * overview is dead weight for a household-name employer).
 */
export const REPORT_SECTIONS = ["company", "loop", "skills", "experiences", "recruiter"] as const;

export type ReportSection = (typeof REPORT_SECTIONS)[number];

/**
 * What a caller gets without asking. "recruiter" is deliberately absent: it is
 * the first opt-in section — and the input-schema default doubles as the shape
 * of stored inputs from runs that predate the field, which never asked for it.
 */
export const DEFAULT_SECTIONS = [
  "company",
  "loop",
  "skills",
  "experiences",
] as const satisfies readonly ReportSection[];

/**
 * Ceilings on caller-supplied free text. Every field below is interpolated into
 * the synthesize prompt, which is billed per input token on the priciest model.
 * The BudgetTracker reserves against a conservative token estimate, while these
 * edge bounds also prevent crafted inputs from consuming the whole run budget.
 *
 * They are set well above what the form can realistically produce — they exist
 * to stop a crafted request, not to discipline a real one.
 */
export const MAX_COMPANY_NAME = 120;
export const MAX_URL = 500;
export const MAX_YEARS_EXPERIENCE = 50;
export const MAX_TECH_STACK = 500;
export const MAX_ROLE_CONTEXT = 500;
export const MAX_LOCATION = 120;
export const MAX_TEAM_CONTEXT = 200;
export const MAX_RECRUITER_NOTES = 2000;
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
  location: z.string().max(MAX_LOCATION).optional(),
  teamContext: z.string().max(MAX_TEAM_CONTEXT).optional(),
  recruiterNotes: z.string().max(MAX_RECRUITER_NOTES).optional(),
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
  /** Extensions that only fill prose sections do not need to synthesize questions. */
  generateQuestions: z.boolean().optional(),
  /**
   * Which optional sections to produce. Defaulted rather than required so a
   * caller predating the field — and the stored inputs of an older run — still
   * gets the full report, minus opt-in sections it never asked for.
   */
  sections: z.array(z.enum(REPORT_SECTIONS)).default([...DEFAULT_SECTIONS]),
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
            'One of the round identifiers supplied in the prompt, or "company", "interviewer", ' +
              '"loop_format", or "interview_experience"'
          ),
      })
    )
    .min(3)
    // High effort plans up to 12 queries.
    .max(12),
});

export type ResearchPlan = z.infer<typeof researchPlanSchema>;

/**
 * When direct interview evidence for a company is thin (early-stage startups,
 * companies with no Glassdoor/Blind/Reddit footprint), the pipeline runs a
 * second gather wave using these proxy angles instead of returning an empty
 * report. Questions grounded in this evidence are labelled `basis: "inferred"`.
 */
export const PROXY_QUERY_CATEGORIES = [
  "founder_background",
  "funding_stage",
  "comparable_company",
  "role_norms",
] as const;

/** Stage output when the sparse-evidence pivot fires: the proxy search plan. */
export const proxyPlanSchema = z.object({
  queries: z
    .array(
      z.object({
        query: z.string(),
        purpose: z.string().describe("Which proxy signal this query targets"),
        depth: z.enum(["basic", "advanced"]),
        category: z
          .string()
          .describe(
            'One of "founder_background", "funding_stage", "comparable_company", "role_norms"'
          ),
      })
    )
    .min(2)
    .max(8),
});

export type ProxyPlan = z.infer<typeof proxyPlanSchema>;

/**
 * A single web source pulled during gather, before compression. Shared between
 * the pipeline and the sparsity scorer, so it lives here rather than in
 * pipeline.ts to avoid a circular import.
 */
export interface GatheredSource {
  url: string;
  title: string;
  category: string;
  content: string;
  /** True once tavilyExtract replaced the search snippet with the full page. */
  extracted: boolean;
}

export const RESOURCE_KINDS = [
  "interview_experience",
  "company_engineering",
  "company_docs",
  "discussion",
  "interviewer",
  "video",
  "code",
  "other",
] as const;

export type ResearchResourceKind = (typeof RESOURCE_KINDS)[number];

export const RESOURCE_ACCESS_LEVELS = ["full_text", "search_preview", "link_only"] as const;

export type ResourceAccess = (typeof RESOURCE_ACCESS_LEVELS)[number];

/** Internal gather metadata. Content intentionally lives only on GatheredSource. */
export interface ResourceCandidate {
  url: string;
  title: string;
  faviconUrl?: string;
  score: number;
  queries: string[];
  purposes: string[];
  categories: string[];
  domain: string;
  access: ResourceAccess;
  extractionOutcome: "not_attempted" | "full_text" | "failed" | "empty";
}

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
  basis: z
    .enum(["evidence", "inferred", "baseline"])
    .describe(
      '"evidence" when grounded in direct accounts of interviewing at THIS company; ' +
        '"inferred" when derived from proxy signals (founders\' prior companies, comparable ' +
        'companies, funding-stage norms); "baseline" when it is role-standard preparation ' +
        "without evidence that this company asks it"
    ),
});

export type PredictedQuestion = z.infer<typeof questionSchema>;

export const importantLinkSchema = z.object({
  title: z.string(),
  url: z.string(),
  why: z.string().describe("One sentence: why this is worth the candidate's time"),
});

export type ImportantLink = z.infer<typeof importantLinkSchema>;

const publicHttpUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "Only HTTP and HTTPS resource URLs are allowed");

const faviconUrlSchema = z
  .string()
  .url()
  .refine((value) => new URL(value).protocol === "https:", "Only HTTPS favicon URLs are allowed");

export const researchResourceSchema = z.object({
  title: z.string(),
  url: publicHttpUrlSchema,
  faviconUrl: faviconUrlSchema.optional(),
  why: z.string(),
  kind: z.enum(RESOURCE_KINDS),
  access: z.enum(RESOURCE_ACCESS_LEVELS),
  usedAsEvidence: z.boolean(),
});

export type ResearchResource = z.infer<typeof researchResourceSchema>;

export const requiredSkillSchema = z.object({
  skill: z.string().describe("The skill itself, short enough to read as a badge (1-4 words)"),
  why: z
    .string()
    .describe(
      "One sentence: why this role needs it, grounded in the evidence or the job description"
    ),
});

export type RequiredSkill = z.infer<typeof requiredSkillSchema>;

export const recruiterPitchSchema = z.object({
  candidateProfile: z
    .string()
    .describe(
      "2-3 sentences: the candidate profile this company's recruiters favour — the " +
        "backgrounds, signals, and traits their screens select for, grounded in the evidence"
    ),
  presentationTips: z
    .array(z.string())
    .describe(
      "Concrete, actionable tips for presenting yourself to this company's recruiters — " +
        "what to lead with on the resume and in the screen call, which experience and " +
        "keywords to foreground. Each tip specific to this company and role, never boilerplate"
    ),
});

export type RecruiterPitch = z.infer<typeof recruiterPitchSchema>;

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
  // Section-only extensions intentionally produce no new questions.
  questions: z.array(questionSchema),
  skillsRequired: z
    .array(requiredSkillSchema)
    .describe(
      "The skills this role actually demands — not a restatement of the job description's " +
        "bullet list. Include the non-obvious ones implied by what the company builds (a " +
        "company shipping web agents needs candidates who understand agent architecture, " +
        "even where the posting never says so), its stack, and its scale"
    ),
  prepPlan: z.array(z.string()).describe("Ordered list of prep priorities"),
  interviewExperiences: z
    .array(importantLinkSchema)
    .describe(
      "First-hand interview experience write-ups for this company (Glassdoor, LeetCode " +
        "Discuss, Blind, Reddit, personal blogs), chosen from the evidence URLs. Each " +
        '"why" names the role, level, and recency when known'
    ),
  recruiterPitch: recruiterPitchSchema.describe(
    "Who this company's recruiters are looking for, and how to present yourself to them"
  ),
  importantLinks: z
    .array(importantLinkSchema)
    .describe("3-6 most valuable sources for the candidate to read, chosen from the evidence URLs"),
  researchResources: z
    .array(researchResourceSchema)
    .optional()
    .describe(
      "Curated research library. Metadata-only links may be included for manual reading but " +
        "must never be described as evidence"
    ),
  /**
   * Assigned by the pipeline, never earned by the model: "sparse" once the
   * proxy-research wave fired because direct evidence was thin, "rich"
   * otherwise. Optional so reports stored before this field render without a
   * coverage notice.
   */
  evidenceCoverage: z.enum(["rich", "sparse"]).optional(),
});

/**
 * What a report looks like once stored and rendered, as opposed to what the
 * model is asked to generate. A section the caller switched off is absent from
 * the generation schema entirely and lands here as `null`.
 *
 * The distinction is load-bearing for the two array sections: `[]` means we
 * looked and found nothing, `null` means we never looked. `skillsRequired` and
 * `recruiterPitch` are additionally optional because reports stored before they
 * existed lack the keys.
 */
export const storedReportSchema = reportSchema.extend({
  companySnapshot: reportSchema.shape.companySnapshot.nullable(),
  companyExplainer: reportSchema.shape.companyExplainer.nullable(),
  likelyLoopStructure: reportSchema.shape.likelyLoopStructure.nullable(),
  skillsRequired: reportSchema.shape.skillsRequired.nullable().optional(),
  interviewExperiences: reportSchema.shape.interviewExperiences.nullable(),
  recruiterPitch: reportSchema.shape.recruiterPitch.nullable().optional(),
});

export type Report = z.infer<typeof storedReportSchema>;

/** What stage 4 asks the model for, before omitted sections are nulled back in. */
export type GeneratedReport = z.infer<typeof reportSchema>;

export interface PipelineProgressEvent {
  stage: "plan" | "gather" | "broaden" | "compress" | "synthesize" | "done" | "error";
  message: string;
  at: string;
}
