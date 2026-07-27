import { z } from "zod";

import type { BudgetTracker, EffortPreset } from "../budget";
import { appendDistinctQuestions, coverageByCategory, validateQuestions } from "../evidence";
import { ResearchStructuredOutputError, generateStructured } from "../gemini";
import { candidateWhy, canonicalizePublicUrl, resourceKind } from "../resources";
import { describeTargetProfile } from "../target";
import {
  type CompressedNote,
  type GeneratedReport,
  type ImportantLink,
  type PredictedQuestion,
  type Report,
  type ResearchInput,
  type ResearchResource,
  type ResourceCandidate,
  type TargetProfile,
  importantLinkSchema,
  questionSchema,
  recruiterPitchSchema,
  requiredSkillSchema,
  researchContextFromInput,
} from "../types";
import { auditQuestionsStage } from "./audit";
import { describeInput, mapChunked, wants } from "./shared";

const QUESTION_BATCH_SIZE = 5;
const QUESTION_RECOVERY_BATCH_SIZE = 3;
const QUESTION_BATCH_CONCURRENCY = 2;
const QUESTION_COVERAGE_PASSES = 2;
const LINK_EVIDENCE_SUMMARY_CHARS = 500;

type CoreNarrativeField =
  | "companySnapshot"
  | "companyExplainer"
  | "likelyLoopStructure"
  | "interviewerSummary"
  | "skillsRequired"
  | "prepPlan"
  | "recruiterPitch";

type CoreNarrative = Pick<GeneratedReport, CoreNarrativeField>;

interface CoreFieldDefinition {
  name: CoreNarrativeField;
  schema: z.ZodType;
  outputTokens: number;
  fallback: CoreNarrative[CoreNarrativeField];
}

function minimumQuestionCount(target: string): number {
  const minimum = Number(target.match(/\d+/)?.[0] ?? 0);
  return Number.isFinite(minimum) ? minimum : 0;
}

interface QuestionBatch {
  category: string;
  count: number;
  index: number;
  total: number;
}

type QuestionStage = "synthesize_questions" | "synthesize_topup" | "synthesize_repair";

export class ResearchCoverageError extends Error {
  constructor(rounds: string[], minimum: number, questions: Array<{ category: string }>) {
    const targets = questionDeficits(rounds, minimum);
    const missing = questionDeficits(rounds, minimum, questions);
    const details = rounds
      .filter((round) => (missing.get(round) ?? 0) > 0)
      .map((round) => {
        const target = targets.get(round) ?? 0;
        return `${round}: ${target - (missing.get(round) ?? 0)}/${target}`;
      });
    super(
      `Research could not complete requested round coverage (${details.join(", ")}) after ` +
        "bounded retries. No incomplete report was saved."
    );
    this.name = "ResearchCoverageError";
  }
}

function questionDeficits(
  rounds: string[],
  minimum: number,
  questions: Array<{ category: string }> = []
): Map<string, number> {
  const existing = new Map<string, number>();
  for (const question of questions) {
    existing.set(question.category, (existing.get(question.category) ?? 0) + 1);
  }
  const base = rounds.length > 0 ? Math.floor(minimum / rounds.length) : 0;
  const remainder = rounds.length > 0 ? minimum % rounds.length : 0;
  return new Map(
    rounds.map((round, index) => [
      round,
      Math.max(0, base + (index < remainder ? 1 : 0) - (existing.get(round) ?? 0)),
    ])
  );
}

function questionBatches(
  deficits: Map<string, number>,
  batchSize = QUESTION_BATCH_SIZE
): QuestionBatch[] {
  const batches: QuestionBatch[] = [];
  for (const [category, count] of deficits) {
    const total = Math.ceil(count / batchSize);
    for (let index = 0; index < total; index += 1) {
      batches.push({
        category,
        count: Math.min(batchSize, count - index * batchSize),
        index: index + 1,
        total,
      });
    }
  }
  return batches;
}

/** Stage 4 — synthesize bounded narrative, question, and audit objects. */
export async function synthesizeStage(
  input: ResearchInput,
  targetProfile: TargetProfile,
  notes: CompressedNote[],
  resourceCandidates: ResourceCandidate[],
  budget: BudgetTracker,
  preset: EffortPreset,
  broadened: boolean
): Promise<Report> {
  // Direct callers and legacy stored inputs predate this flag; only an explicit
  // false means a section-only extension.
  const generateQuestions = input.generateQuestions !== false;
  const renderEvidence = (sourceNotes: CompressedNote[]) =>
    sourceNotes
      .map((n, i) => {
        const profile = n.profile
          ? `Source profile: type=${n.profile.sourceType}; resource=${n.profile.resourceKind}; ` +
            `company=${n.profile.companyMatch}; ` +
            `role=${n.profile.role ?? "not stated"} (${n.profile.roleMatch}); ` +
            `level=${n.profile.level ?? "not stated"} (${n.profile.levelMatch}); ` +
            `experience=${n.profile.experienceYears ?? "not stated"} (${n.profile.experienceMatch}); ` +
            `location=${n.profile.location ?? "not stated"} (${n.profile.locationMatch}); ` +
            `access=${n.profile.access}; question-detail=${n.profile.questionDetail}; ` +
            `usable=${n.profile.contentUsable}; proxy=${n.profile.proxyEvidence}; ` +
            `reported-question-evidence=${n.profile.canSupportReportedQuestion}`
          : "Source profile: unclassified";
        return `[${i + 1}] (${(n.categories ?? [n.category]).join(", ")}) ${n.sourceTitle} — ${n.sourceUrl}\n${profile}\n${n.summary}`;
      })
      .join("\n\n");
  const evidenceBlock = renderEvidence(notes);
  const evidenceForRound = (category: string) => {
    const relevant = notes.filter((note) => {
      const categories = note.categories ?? [note.category];
      return (
        categories.includes(category) ||
        categories.includes("interview_experience") ||
        note.profile?.firstHand ||
        note.profile?.proxyEvidence
      );
    });
    return renderEvidence(relevant.length > 0 ? relevant : notes);
  };
  // The proxy branch permits inferred questions; both branches keep the same
  // strict distinction between exact prompts, reconstructed topics, and baselines.
  const basisRules = broadened
    ? `- Direct interview evidence for this company is thin, so proxy evidence is included in
  the notes under categories "founder_background", "funding_stage", "comparable_company",
  and "role_norms". You may predict questions inferred from it.
- Set "basis" to "evidence" only when a direct account at THIS company provides a sufficiently
  exact question prompt (question-detail=exact).
- Set "basis" to "reconstructed" when a direct account at THIS company confirms a topic or
  partial prompt but withholds the exact wording. Write a concrete practice question, explicitly
  say it was reconstructed in the rationale, cite that account, and never use high confidence.
- Set "basis" to "inferred" only when the question derives from a source marked proxy=true.
- An inferred question must still cite the proxy-evidence URLs it rests on, and its
  rationale must name the specific comparison signal it leans on. An inferred question is
  never confidence "high".
- Fill remaining useful coverage with "baseline" questions tailored to the role, job description,
  and company product. They may have no evidence URL and must always be confidence "low"; never
  imply the company has asked them.`
    : `- Set "basis" to "evidence" only when a direct first-hand account at THIS company has
  question-detail=exact and actually supplies the prompt.
- Set "basis" to "reconstructed" when a direct account at THIS company confirms only a topic or
  partial prompt. Create a concrete practice version, explicitly call it reconstructed in the
  rationale, cite the account, and never use high confidence.
- "inferred" is reserved for notes marked proxy=true. Do not use it for generic interview guides,
  company engineering material, job requirements, or adjacent role/level accounts.
- Use "baseline" for role-standard preparation synthesized from the job description, company
  product, engineering material, or general prep resources. It is always low confidence and must
  never imply that the company asks it.
- Never copy target attributes into a source. Preserve the source's stated role, level, experience,
  and location even when they differ from the target.
- A source with roleMatch=adjacent or unknown may inform a general company round, but it does not
  prove that the question is specific to the target role.
- Within each round, prefer sources in this order: exact role + level + location, exact role,
  adjacent role, then general company evidence. Never let a generic guide outrank a direct exact-role
  candidate account merely because the guide is longer or more polished.`;

  const company = wants(input, "company");
  const loop = wants(input, "loop");
  const skills = wants(input, "skills");
  const experiences = wants(input, "experiences");
  const recruiter = wants(input, "recruiter");
  const requiredQuestionMinimum = generateQuestions
    ? minimumQuestionCount(preset.questionTarget)
    : 0;

  // Link validation and deterministic fallbacks share this exact allow-list.
  // A model-selected URL that was not represented in the notes is never shown.
  const known = new Set(
    notes
      .map((note) => canonicalizePublicUrl(note.sourceUrl))
      .filter((url): url is string => url !== null)
  );

  const coreNarrativeRules = [
    company &&
      `- Write companyExplainer for someone who has never heard of the company: 2-3 sentences,
  no jargon and no buzzwords, ending with one concrete everyday example of the product in
  action. companySnapshot stays the technical view: stack, scale signals, engineering culture.`,
    loop &&
      `- If the loop-format evidence reveals a round type the user didn't request, include it
  anyway and state that it was not explicitly requested.`,
    `- Summarize each named interviewer in interviewerSummary using only public evidence in the
  notes; if several were named, cover each briefly.`,
    `- Do not invent citations. Do not invent company facts not present in the notes.`,
    `- Treat the job description and the company's actual product as the primary subject-matter
  signals. Comparable companies and founder backgrounds may calibrate interview style and depth,
  but must not overwrite what this specific role asks the candidate to build.`,
    skills &&
      `- In skillsRequired, name the skills this specific role actually demands. Do not merely
  restate the job description's bullet list: the value is in the skills the posting leaves
  implicit but the company's product makes unavoidable. Work from what the company builds,
  the stack the evidence reveals, the scale it operates at, and the job description together.
  Each "why" is one sentence naming the reason the role needs it,
  grounded in the evidence or the job description — never a restatement of the skill.
  Order them most to least important, and keep each "skill" short enough to read as a
  badge. Do not pad with generic filler ("communication", "problem solving") unless the
  evidence specifically calls it out.`,
    recruiter &&
      `- In recruiterPitch, describe the candidate this company's recruiters are actually
  screening for and how to present yourself to them. candidateProfile is a short paragraph
  (2-3 sentences) naming the backgrounds, signals, and traits their screens favour —
  grounded in what the company builds, its stated values, and how candidates in the notes
  describe its recruiter screens, never generic recruiting advice. presentationTips is 4-6
  concrete, actionable tips: what to lead with on the resume and in the recruiter call,
  which experience or projects to foreground, which keywords to surface. Each tip must be
  specific to THIS company and role — never boilerplate like "be confident" or "research
  the company".`,
    `- Keep prepPlan ordered, concrete, and specific to the target role and evidence. Do not
  include predicted questions in this response; questions are generated in a separate stage.`,
  ]
    .filter((rule): rule is string => Boolean(rule))
    .join("\n");

  const questionRules = [
    `- Set every question's "category" to the supplied round identifier exactly. Never invent or
  reformat a category.`,
    `- Every evidence, reconstructed, or inferred question must cite at least one evidence URL
  from the notes. A baseline question has no URL and must say it is role-standard preparation,
  not a reported company question.`,
    basisRules,
    `- If evidence is thin, use honest low-confidence baselines rather than fabricating specifics.`,
    `- Every prompt must be self-contained and practicable, with concrete inputs, outputs,
  constraints, and success criteria where the round requires them. A topic name alone is not a
  question.`,
    `- Calibrate difficulty to the target experience, stack, role, and job description.`,
    `- Do not invent citations or company facts. Preserve each source's actual role, level,
  experience, and location.`,
    `- Treat the target job description and product as primary subject-matter signals. Proxy
  evidence may calibrate style and depth but must not overwrite the target role.`,
    `- Questions in separate batches must cover different problems and topic families.`,
  ].join("\n");

  const summaryFor = (categories: string[]) =>
    notes.find((note) => {
      const noteCategories = note.categories ?? [note.category];
      return categories.some((category) => noteCategories.includes(category));
    })?.summary;
  const roleName = targetProfile.role.canonicalTitle ?? input.roleContext ?? "the target role";
  const companyName = targetProfile.company.canonicalName || input.companyName;
  const fallbackPrepPlan = [
    ...input.interviewTypes.map(
      (category) =>
        `Practice the ${category.replaceAll("_", " ")} round under realistic interview timing.`
    ),
    `Map your strongest examples to ${roleName} responsibilities at ${companyName}.`,
  ];
  const fallbackSkills = targetProfile.role.skills.slice(0, 8).map((skill) => ({
    skill,
    why: `The supplied role profile identifies ${skill} as relevant to ${roleName}.`,
  }));
  const fallbackRecruiterPitch = {
    candidateProfile:
      `${companyName} is hiring for ${roleName}. Lead with directly relevant delivery evidence ` +
      "and avoid claiming company-specific preferences that the public sources do not establish.",
    presentationTips: [
      `Open with the experience most closely aligned to ${roleName}.`,
      "Quantify scope, ownership, technical trade-offs, and production impact.",
      "Use the terminology in the supplied job description without overstating your experience.",
      "Prepare one concise example of cross-functional delivery and one of technical ownership.",
    ],
  };

  const boundedCoreSchemas: Record<CoreNarrativeField, z.ZodType> = {
    companySnapshot: z
      .string()
      .min(1)
      .max(1_800)
      .describe("Concise technical company view: product, stack, scale, and engineering culture"),
    companyExplainer: z
      .string()
      .min(1)
      .max(1_000)
      .describe("Plain-language company explanation with one concrete product example"),
    likelyLoopStructure: z
      .string()
      .min(1)
      .max(1_800)
      .describe("Reported interview process, clearly separating evidence from uncertainty"),
    interviewerSummary: z
      .string()
      .min(1)
      .max(1_500)
      .nullable()
      .describe("Null when the caller supplied no interviewer"),
    skillsRequired: z
      .array(
        requiredSkillSchema.extend({
          skill: z.string().min(1).max(120),
          why: z.string().min(1).max(700),
        })
      )
      .max(10),
    prepPlan: z.array(z.string().min(1).max(800)).max(12),
    recruiterPitch: recruiterPitchSchema.extend({
      candidateProfile: z.string().min(1).max(1_800),
      presentationTips: z.array(z.string().min(1).max(800)).max(8),
    }),
  };

  const coreFields: CoreFieldDefinition[] = [
    ...(company
      ? [
          {
            name: "companySnapshot" as const,
            schema: boundedCoreSchemas.companySnapshot,
            outputTokens: 900,
            fallback:
              summaryFor(["company"]) ??
              `Public evidence was insufficient to produce a reliable technical snapshot of ${companyName}.`,
          },
          {
            name: "companyExplainer" as const,
            schema: boundedCoreSchemas.companyExplainer,
            outputTokens: 600,
            fallback:
              `${companyName} is the company named in this interview target. ` +
              "The gathered public evidence did not establish enough product detail for a more specific explanation.",
          },
        ]
      : []),
    ...(loop
      ? [
          {
            name: "likelyLoopStructure" as const,
            schema: boundedCoreSchemas.likelyLoopStructure,
            outputTokens: 900,
            fallback:
              summaryFor(["loop_format", "interview_experience"]) ??
              `No reliable public source established the interview loop for ${roleName} at ${companyName}.`,
          },
        ]
      : []),
    {
      name: "interviewerSummary",
      schema: boundedCoreSchemas.interviewerSummary,
      outputTokens: 600,
      fallback:
        input.interviewers.length === 0
          ? null
          : `No reliable public evidence was found for ${input.interviewers
              .map((interviewer) => interviewer.name)
              .join(", ")}.`,
    },
    ...(skills
      ? [
          {
            name: "skillsRequired" as const,
            schema: boundedCoreSchemas.skillsRequired,
            outputTokens: 1_500,
            fallback: fallbackSkills,
          },
        ]
      : []),
    {
      name: "prepPlan",
      schema: boundedCoreSchemas.prepPlan,
      outputTokens: 1_400,
      fallback: fallbackPrepPlan,
    },
    ...(recruiter
      ? [
          {
            name: "recruiterPitch" as const,
            schema: boundedCoreSchemas.recruiterPitch,
            outputTokens: 1_500,
            fallback: fallbackRecruiterPitch,
          },
        ]
      : []),
  ];

  // Core prose only needs the strongest representative evidence. Every
  // discovered URL is still retained in researchResources below.
  const coreNotes = [...notes]
    .sort((left, right) => {
      const score = (note: CompressedNote) =>
        Number(note.profile?.companyMatch === "exact") * 4 +
        Number(note.profile?.firstHand) * 3 +
        Number(note.profile?.contentUsable) * 2 +
        Number((note.categories ?? [note.category]).includes("company"));
      return score(right) - score(left);
    })
    .slice(0, 36)
    .map((note) => ({ ...note, summary: note.summary.slice(0, 1_500) }));
  const corePrompt = `${describeInput(input)}

Resolved target profile:
${describeTargetProfile(targetProfile)}

Evidence notes:
${renderEvidence(coreNotes) || "(no evidence gathered; degrade gracefully and avoid unsupported claims)"}`;
  let coreRecoveryIndex = 0;

  const generateCoreFields = async (
    fields: CoreFieldDefinition[],
    stage: string
  ): Promise<Partial<CoreNarrative>> => {
    const schema = z.object(
      Object.fromEntries(fields.map((field) => [field.name, field.schema])) as z.ZodRawShape
    );
    try {
      const value = (await generateStructured({
        model: "gemini-3.1-pro-preview",
        stage,
        schema,
        budget,
        maxOutputTokens: Math.min(
          preset.synthesisMaxOutputTokens,
          400 + fields.reduce((sum, field) => sum + field.outputTokens, 0)
        ),
        thinkingLevel: "low",
        system: `You are an expert interview coach. Using ONLY the evidence notes provided,
produce exactly the requested bounded core fields of an interview-preparation report.
Questions and resource-link collections are generated separately and are intentionally absent.
Keep every field concise enough to finish the complete JSON object.

Rules:
${coreNarrativeRules}`,
        prompt: corePrompt,
      })) as Record<string, unknown>;
      return Object.fromEntries(fields.map((field) => [field.name, value[field.name]]));
    } catch (error) {
      if (!(error instanceof ResearchStructuredOutputError)) throw error;

      if (fields.length > 1) {
        const middle = Math.ceil(fields.length / 2);
        const recoveryId = ++coreRecoveryIndex;
        if (process.env.NODE_ENV !== "test") {
          console.warn(
            `[research:pipeline] ${stage} malformed; isolating ${fields.length} core fields`
          );
        }
        const left = await generateCoreFields(
          fields.slice(0, middle),
          `synthesize_core_${recoveryId}_a`
        );
        const right = await generateCoreFields(
          fields.slice(middle),
          `synthesize_core_${recoveryId}_b`
        );
        return { ...left, ...right };
      }

      const [field] = fields;
      if (process.env.NODE_ENV !== "test") {
        console.warn(
          `[research:pipeline] ${stage} malformed for ${field.name}; using evidence-safe fallback`
        );
      }
      return { [field.name]: field.fallback } as Partial<CoreNarrative>;
    }
  };

  const generated = await generateCoreFields(coreFields, "synthesize");

  const boundedImportantLinkSchema = importantLinkSchema.extend({
    title: z.string().min(1).max(300),
    url: z.string().min(1).max(500),
    why: z.string().min(1).max(600),
  });
  const linkCatalog = [...notes]
    .sort((left, right) => {
      const score = (note: CompressedNote) =>
        Number(note.profile?.companyMatch === "exact") * 4 +
        Number(note.profile?.firstHand) * 4 +
        Number(note.profile?.contentUsable) * 2;
      return score(right) - score(left);
    })
    .slice(0, 80)
    .map((note) => ({
      title: note.sourceTitle,
      url: canonicalizePublicUrl(note.sourceUrl) ?? note.sourceUrl,
      categories: note.categories ?? [note.category],
      summary: note.summary.slice(0, LINK_EVIDENCE_SUMMARY_CHARS),
      profile: note.profile
        ? {
            resourceKind: note.profile.resourceKind,
            companyMatch: note.profile.companyMatch,
            role: note.profile.role,
            roleMatch: note.profile.roleMatch,
            level: note.profile.level,
            location: note.profile.location,
            firstHand: note.profile.firstHand,
            pageIntent: note.profile.pageIntent,
            access: note.profile.access,
          }
        : null,
    }));

  const fallbackLinks = (
    kind: "experiences" | "important",
    excludedUrls: Set<string> = new Set()
  ): ImportantLink[] => {
    const links: ImportantLink[] = [];
    const selectedUrls = new Set(excludedUrls);
    const eligible = (profile: CompressedNote["profile"]) =>
      kind === "important" || Boolean(profile?.companyMatch === "exact" && profile.firstHand);
    const add = (title: string, rawUrl: string, why: string) => {
      const url = canonicalizePublicUrl(rawUrl);
      if (links.length >= preset.linksMax || !url || !known.has(url) || selectedUrls.has(url)) {
        return;
      }
      selectedUrls.add(url);
      links.push({ title, url, why });
    };

    for (const candidate of resourceCandidates) {
      if (candidate.relevance?.tier === "reject" || !eligible(candidate.profile)) continue;
      add(candidate.title, candidate.url, candidateWhy(candidate));
    }
    for (const note of notes) {
      if (!eligible(note.profile)) continue;
      const categories = (note.categories ?? [note.category]).join(", ").replaceAll("_", " ");
      add(note.sourceTitle, note.sourceUrl, `Evidence gathered for ${categories}.`);
    }
    return links;
  };

  const generateLinkSection = async (
    stage: "synthesize_experiences" | "synthesize_links",
    field: "interviewExperiences" | "importantLinks",
    rules: string,
    fallback: ImportantLink[]
  ): Promise<ImportantLink[]> => {
    try {
      const result = await generateStructured({
        model: "gemini-3.5-flash",
        stage,
        schema: z.object({
          [field]: z.array(boundedImportantLinkSchema).max(preset.linksMax),
        }),
        budget,
        maxOutputTokens: Math.min(preset.synthesisMaxOutputTokens, 800 + preset.linksMax * 500),
        thinkingLevel: "low",
        system: `Select a bounded resource list for an interview-preparation report.
Return at most ${preset.linksMax} links. Use only URLs in the supplied catalog. Do not
invent, repair, or rewrite URLs. Keep every title and reason concise.

Rules:
${rules}`,
        prompt: `${describeInput(input)}

Resolved target profile:
${describeTargetProfile(targetProfile)}

Evidence catalog:
${JSON.stringify(linkCatalog)}`,
      });
      const selected = (result as Record<string, ImportantLink[]>)[field] ?? [];
      return selected;
    } catch (error) {
      if (process.env.NODE_ENV !== "test") {
        console.warn(
          `[research:pipeline] ${stage} failed; using deterministic ranked links`,
          error instanceof Error ? error.message : String(error)
        );
      }
      return fallback;
    }
  };

  const generateQuestionBatchOnce = async (
    batch: QuestionBatch,
    stage: QuestionStage,
    existingQuestions: string[]
  ): Promise<PredictedQuestion[]> => {
    const boundedQuestionSchema = questionSchema.extend({
      category: z.literal(batch.category),
      question: z.string().min(5).max(1_400),
      rationale: z.string().min(5).max(600),
      prepNote: z.string().min(5).max(1_200),
      evidenceUrls: z.array(z.string().min(1).max(500)).max(8),
    });
    const schema = z.object({
      questions: z.array(boundedQuestionSchema).length(batch.count),
    });
    const result = await generateStructured({
      model: "gemini-3.5-flash",
      stage,
      schema,
      budget,
      maxOutputTokens: Math.min(preset.synthesisMaxOutputTokens, 1_000 + batch.count * 1_200),
      thinkingLevel: "low",
      system: `You generate one bounded batch of interview-preparation questions.
Return ${batch.count} distinct, self-contained questions for exactly the supplied round.
This is batch ${batch.index} of ${batch.total} for that round.
Keep each question under 140 words, its rationale under 60 words, and its prep note under
120 words. Return exactly ${batch.count} array items; concise complete JSON matters more than prose.

${questionRules}`,
      prompt: `${describeInput(input)}

Resolved target profile:
${describeTargetProfile(targetProfile)}

Round identifier: ${batch.category}
Questions required in this batch: ${batch.count}

Questions already used; do not repeat or paraphrase:
${existingQuestions.length > 0 ? existingQuestions.map((question) => `- ${question}`).join("\n") : "(none)"}

Evidence notes relevant to this round:
${evidenceForRound(batch.category) || "(no direct evidence; produce honest role-standard baselines)"}`,
    });
    return result.questions;
  };

  const generateQuestionBatch = async (
    batch: QuestionBatch,
    stage: QuestionStage,
    existingQuestions: string[]
  ): Promise<PredictedQuestion[]> => {
    try {
      return await generateQuestionBatchOnce(batch, stage, existingQuestions);
    } catch (error) {
      if (!(error instanceof ResearchStructuredOutputError) || batch.count <= 1) {
        throw error;
      }

      const recoverySize =
        batch.count > QUESTION_RECOVERY_BATCH_SIZE ? QUESTION_RECOVERY_BATCH_SIZE : 1;
      const recoveryBatches = questionBatches(
        new Map([[batch.category, batch.count]]),
        recoverySize
      );
      if (process.env.NODE_ENV !== "test") {
        console.warn(
          `[research:pipeline] ${stage} ${batch.category} batch of ${batch.count} malformed; ` +
            `retrying as ${recoveryBatches.map((item) => item.count).join("+")}`
        );
      }

      let recovered: PredictedQuestion[] = [];
      for (const recoveryBatch of recoveryBatches) {
        const recoveredQuestions = await generateQuestionBatch(recoveryBatch, stage, [
          ...existingQuestions,
          ...recovered.map((question) => question.question),
        ]);
        recovered = appendDistinctQuestions(recovered, recoveredQuestions);
      }
      return recovered;
    }
  };

  let generatedQuestions: PredictedQuestion[] = [];
  if (generateQuestions) {
    const primaryBatches = questionBatches(
      questionDeficits(input.interviewTypes, requiredQuestionMinimum)
    );
    const batchResults = await mapChunked(
      primaryBatches,
      QUESTION_BATCH_CONCURRENCY,
      () => false,
      (batch) => generateQuestionBatch(batch, "synthesize_questions", input.excludeQuestions)
    );
    for (const questions of batchResults) {
      generatedQuestions = appendDistinctQuestions(generatedQuestions, questions);
    }
  }

  // Field by field, not a spread of defaults under the result: an omitted
  // section must land as null even if the model (or a test double) hands back
  // more than the schema asked for.
  const report: Report = {
    ...generated,
    questions: generatedQuestions,
    companySnapshot: company
      ? (generated.companySnapshot ??
        `Public evidence was insufficient to produce a reliable technical snapshot of ${companyName}.`)
      : null,
    companyExplainer: company
      ? (generated.companyExplainer ??
        `${companyName} is the company named in this interview target. Public evidence was insufficient for a more specific explanation.`)
      : null,
    likelyLoopStructure: loop
      ? (generated.likelyLoopStructure ??
        `No reliable public source established the interview loop for ${roleName} at ${companyName}.`)
      : null,
    interviewerSummary: generated.interviewerSummary ?? null,
    skillsRequired: skills ? (generated.skillsRequired ?? fallbackSkills) : null,
    prepPlan: generated.prepPlan ?? fallbackPrepPlan,
    interviewExperiences: experiences ? [] : null,
    recruiterPitch: recruiter ? (generated.recruiterPitch ?? fallbackRecruiterPitch) : null,
    importantLinks: [],
    researchContext: researchContextFromInput(input),
  };

  // A URL the notes never contained is a hallucination — strip it from both
  // question citations and importantLinks before it reaches the UI as a link.
  const profilesByUrl = new Map(
    notes.map((note) => [canonicalizePublicUrl(note.sourceUrl) ?? note.sourceUrl, note.profile])
  );

  const normalizeQuestions = (questions: PredictedQuestion[]) => {
    const normalized = questions.map((original) => {
      const question = {
        ...original,
        evidenceUrls: original.evidenceUrls
          .map(canonicalizePublicUrl)
          .filter((url): url is string => Boolean(url && known.has(url))),
      };
      // A citation stripped as unknown cannot support confidence or an evidence basis.
      if (question.evidenceUrls.length === 0) question.confidence = "low";
      if (!question.basis) question.basis = "baseline";
      if (
        (question.basis === "reconstructed" || question.basis === "inferred") &&
        question.confidence === "high"
      ) {
        question.confidence = "medium";
      }
      if (question.basis === "baseline") {
        question.confidence = "low";
        question.evidenceUrls = [];
      }
      return question;
    });
    return validateQuestions(normalized, profilesByUrl).filter((question) =>
      input.interviewTypes.includes(question.category)
    );
  };

  const generateMissingQuestions = async (
    questions: PredictedQuestion[],
    stage: QuestionStage
  ): Promise<PredictedQuestion[]> => {
    const deficits = questionDeficits(input.interviewTypes, requiredQuestionMinimum, questions);
    if ([...deficits.values()].every((count) => count === 0)) return [];

    const existingQuestions = [
      ...input.excludeQuestions,
      ...questions.map((question) => question.question),
    ];
    const results = await mapChunked(
      questionBatches(deficits),
      QUESTION_BATCH_CONCURRENCY,
      () => false,
      (batch) => generateQuestionBatch(batch, stage, existingQuestions)
    );
    let addition: PredictedQuestion[] = [];
    for (const batch of results) {
      addition = appendDistinctQuestions(addition, batch);
    }
    return normalizeQuestions(addition);
  };

  const fillQuestionCoverage = async (
    questions: PredictedQuestion[],
    stage: QuestionStage
  ): Promise<PredictedQuestion[]> => {
    let filled = questions;
    for (let pass = 0; pass < QUESTION_COVERAGE_PASSES; pass += 1) {
      const addition = await generateMissingQuestions(filled, stage);
      if (addition.length === 0) break;
      const next = appendDistinctQuestions(filled, addition);
      if (next.length === filled.length) break;
      filled = next;
    }
    return filled;
  };

  report.questions = normalizeQuestions(report.questions);

  if (generateQuestions) {
    report.questions = await fillQuestionCoverage(report.questions, "synthesize_topup");
    report.questions = normalizeQuestions(
      await auditQuestionsStage(targetProfile, notes, report.questions, budget)
    );

    // Audit is allowed to discard irreparable questions. Replace only the
    // resulting per-round deficits, then audit those replacements before merge.
    for (let pass = 0; pass < QUESTION_COVERAGE_PASSES; pass += 1) {
      const repairs = await generateMissingQuestions(report.questions, "synthesize_repair");
      if (repairs.length === 0) break;
      const auditedRepairs = normalizeQuestions(
        await auditQuestionsStage(targetProfile, notes, repairs, budget)
      );
      const next = appendDistinctQuestions(report.questions, auditedRepairs);
      if (next.length === report.questions.length) break;
      report.questions = next;
    }

    const remaining = questionDeficits(
      input.interviewTypes,
      requiredQuestionMinimum,
      report.questions
    );
    if ([...remaining.values()].some((count) => count > 0)) {
      throw new ResearchCoverageError(
        input.interviewTypes,
        requiredQuestionMinimum,
        report.questions
      );
    }
  }
  report.evidenceCoverageByCategory = coverageByCategory(report.questions);

  // Resource lists are optional enrichment. They run only after required
  // question coverage succeeds, and any provider/JSON failure falls back to
  // the already-ranked evidence instead of failing the report.
  const firstHandExperienceUrls = new Set(
    notes
      .filter((note) => note.profile?.companyMatch === "exact" && note.profile.firstHand)
      .map((note) => canonicalizePublicUrl(note.sourceUrl))
      .filter((url): url is string => url !== null)
  );
  const fallbackExperiences = experiences ? fallbackLinks("experiences") : [];
  const selectedExperiences = experiences
    ? await generateLinkSection(
        "synthesize_experiences",
        "interviewExperiences",
        `Select first-hand accounts of interviewing at THIS company, regardless of platform or
format. Exclude generic guides, job listings, accounts for other companies, and sources whose
profile does not establish a first-hand interview. In each reason, state role, level, location,
and recency only when the catalog actually provides them. Return an empty array when none qualify.`,
        fallbackExperiences
      )
    : null;
  report.interviewExperiences = selectedExperiences
    ? selectedExperiences.filter((link) => {
        const url = canonicalizePublicUrl(link.url);
        return Boolean(url && firstHandExperienceUrls.has(url));
      })
    : null;
  const experienceUrls = new Set(
    (report.interviewExperiences ?? [])
      .map((link) => canonicalizePublicUrl(link.url))
      .filter((url): url is string => url !== null)
  );
  const fallbackImportantLinks = fallbackLinks("important", experienceUrls);
  report.importantLinks = await generateLinkSection(
    "synthesize_links",
    "importantLinks",
    `Pick the ${preset.linksHint} highest-value sources for this candidate to read. Prefer exact-role
candidate evidence, official engineering material, public technical documentation, and relevant
interviewer writing over generic listicles. Do not select any URL in this exclusion list:
${JSON.stringify([...experienceUrls])}`,
    fallbackImportantLinks
  );

  // `claimed` spans both link sections, so a URL kept as an interview experience
  // cannot appear a second time under Worth reading even if the model repeats it.
  // Only kept URLs are claimed: one dropped at the cap stays available downstream.
  const claimed = new Set<string>();
  const keepLinks = (links: ImportantLink[]) => {
    const kept: ImportantLink[] = [];
    for (const link of links) {
      if (kept.length >= preset.linksMax) break;
      const url = canonicalizePublicUrl(link.url);
      if (!url || !known.has(url) || claimed.has(url)) continue;
      claimed.add(url);
      kept.push({ ...link, url });
    }
    return kept;
  };

  // Null stays null: an excluded section was never searched for, which is not
  // the same claim as "we looked and found nothing".
  if (report.interviewExperiences) {
    report.interviewExperiences = keepLinks(report.interviewExperiences);
  }
  report.importantLinks = keepLinks(report.importantLinks);

  const eligibleCandidates = resourceCandidates.slice(0, preset.resourcesMax);
  const selected: ResearchResource[] = [];
  const selectedUrls = new Set<string>();
  const citedByQuestion = new Set(report.questions.flatMap((question) => question.evidenceUrls));

  const addResource = (candidate: ResourceCandidate) => {
    if (selected.length >= preset.resourcesMax || selectedUrls.has(candidate.url)) return;
    selectedUrls.add(candidate.url);
    selected.push({
      title: candidate.title,
      url: candidate.url,
      ...(candidate.faviconUrl ? { faviconUrl: candidate.faviconUrl } : {}),
      why: candidate.access === "link_only" ? candidateWhy(candidate) : candidateWhy(candidate),
      kind: resourceKind(candidate),
      access: candidate.access,
      usedAsEvidence: citedByQuestion.has(candidate.url),
      categories: [...new Set(candidate.relevance?.matchedCategories ?? [])],
      ...(candidate.relevance?.tier && candidate.relevance.tier !== "reject"
        ? {
            relevanceTier: candidate.relevance.tier,
            relevanceReason: candidate.relevance.reason,
          }
        : {}),
    });
  };

  for (const candidate of eligibleCandidates) addResource(candidate);
  report.researchResources = selected;

  return report;
}
