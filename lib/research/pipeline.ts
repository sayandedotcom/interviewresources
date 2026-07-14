import { z } from "zod";

import { BudgetTracker, EFFORT_PRESETS, type EffortPreset } from "./budget";
import { generateStructured } from "./gemini";
import { assessEvidenceDensity } from "./sparsity";
import { tavilyExtract, tavilyExtractCredits, tavilySearch, tavilySearchCredits } from "./tavily";
import {
  type CompressedNote,
  type GatheredSource,
  type GeneratedReport,
  type ImportantLink,
  type PipelineProgressEvent,
  type ProxyPlan,
  type Report,
  type ReportSection,
  type ResearchInput,
  type ResearchPlan,
  proxyPlanSchema,
  reportSchema,
  researchPlanSchema,
} from "./types";

type OnProgress = (event: PipelineProgressEvent) => void;

/** The report fields a switched-off section removes from the generation schema. */
type OptionalReportField =
  | "companySnapshot"
  | "companyExplainer"
  | "likelyLoopStructure"
  | "skillsRequired"
  | "interviewExperiences";

const noopProgress: OnProgress = () => {};

function emit(onProgress: OnProgress, stage: PipelineProgressEvent["stage"], message: string) {
  onProgress({ stage, message, at: new Date().toISOString() });
}

/**
 * The optional sections this run was asked for. Read through a helper rather
 * than off the array directly so every stage agrees on what "off" means.
 */
function wants(input: ResearchInput, section: ReportSection): boolean {
  return input.sections.includes(section);
}

/** Shared context block so plan and synthesize see the same picture of the candidate. */
function describeInput(input: ResearchInput): string {
  const interviewers = input.interviewers.length
    ? input.interviewers.map((i) => `${i.name}${i.url ? ` (${i.url})` : ""}`).join("; ")
    : "not provided";

  return `Company: ${input.companyName}${input.companyUrl ? ` (${input.companyUrl})` : ""}
Interviewers: ${interviewers}
Rounds to scout: ${input.interviewTypes.join(", ")}
Role context: ${input.roleContext ?? "not provided"}
Candidate years of experience: ${input.yearsExperience || "not provided"}
Candidate tech stack: ${input.techStack || "not provided"}
Location: ${input.location || "not provided"}
Team / org: ${input.teamContext || "not provided"}
Recruiter notes on the process: ${input.recruiterNotes || "not provided"}
Job description: ${input.jobDescription ? input.jobDescription.slice(0, 2000) : "not provided"}`;
}

/** Stage 1 — Plan. Cheap model, structured output. See PRD §6 stage 1 + §5.3 format discovery. */
async function planStage(
  input: ResearchInput,
  budget: BudgetTracker,
  preset: EffortPreset
): Promise<ResearchPlan> {
  const loop = wants(input, "loop");
  // The skills section is inferred from what the company builds, so it needs the
  // company evidence even when the company prose itself was switched off. Only
  // when neither wants it is a "company" query genuinely wasted spend.
  const companyEvidence = wants(input, "company") || wants(input, "skills");

  const loopRule = loop
    ? `Always include exactly one query with category "loop_format" whose purpose is
discovering the company's actual interview process/rounds (e.g. "<company> interview
process rounds") — this may surface rounds the user did not request.`
    : `Do not plan any query with category "loop_format": the candidate did not ask for the
interview-process section, so discovering the loop shape is not worth a search.`;

  const companyRule = companyEvidence
    ? `Use category "company" for queries about what the company builds, its stack, and its scale.`
    : `Do not plan any query with category "company": the candidate did not ask for the company
overview or the skills breakdown, so a company search is not worth its cost.`;

  const recruiterRule = loop
    ? `If recruiter notes already describe the process, the "loop_format" query should
confirm and deepen those specific rounds rather than discover the process from scratch.`
    : `If recruiter notes already describe the process, use them to make the round queries
specific rather than searching for the process itself.`;

  const allowedCategories = [
    ...(companyEvidence ? ['"company"'] : []),
    '"interviewer"',
    ...(loop ? ['"loop_format"'] : []),
    '"interview_experience"',
  ].join(" / ");

  return generateStructured({
    model: "gemini-3.1-flash-lite-preview",
    stage: "plan",
    schema: researchPlanSchema,
    budget,
    system: `You are a research planner for an interview-prep tool. Given a company and the
rounds the candidate wants scouted, produce a compact search plan: ${preset.queriesHint} targeted web-search
queries. ${loopRule} Always include one or
two queries with category "interview_experience" hunting for first-hand accounts from
people who actually interviewed there — Glassdoor reviews, LeetCode Discuss threads, Blind
posts, Reddit threads, personal blog write-ups — narrowed to the candidate's role and
seniority. ${companyRule} If interviewers are named, add one query per interviewer (max 2) with category
"interviewer" seeking their public talks, writing, or open-source work — never target
linkedin.com directly. Some rounds are custom identifiers rather than standard categories;
plan a discovery query for each. Use the job description, tech stack, and years of
experience to make queries specific: seniority and named technologies belong in the query
text. ${recruiterRule}
Where location or team/org are provided, use them to narrow "interview_experience" queries
to that geography or org. Prefer "basic" depth; reserve "advanced" for at most 2-3 of the
highest-value queries (company tech stack, and the primary interview-experience query). Set
each query's
"category" to the round identifier it serves, or ${allowedCategories}. Keep queries concrete and searchable, not vague.`,
    prompt: describeInput(input),
  });
}

/**
 * Stage 1b — Proxy plan. Only runs when gather came back thin. A second cheap
 * call, fed a digest of what wave 1 already found, so it can name-drop the
 * founders/leaders it discovered rather than guessing blind. See PRD §5.3 —
 * this is what keeps an early-stage company from producing an empty report.
 */
async function proxyPlanStage(
  input: ResearchInput,
  wave1Sources: GatheredSource[],
  budget: BudgetTracker,
  preset: EffortPreset
): Promise<ProxyPlan> {
  // Only the company-overview sources are worth digesting for names: the thin
  // interview sources are exactly why we're here.
  const digest = wave1Sources
    .filter((s) => s.category === "company")
    .map((s) => `${s.title}: ${s.content.slice(0, 300)}`)
    .join("\n")
    .slice(0, 3000);

  return generateStructured({
    model: "gemini-3.1-flash-lite-preview",
    stage: "plan_proxy",
    schema: proxyPlanSchema,
    budget,
    system: `The direct interview evidence for this company is thin — it is likely early-stage
or low-profile. Plan ${preset.proxyQueriesHint} proxy web-search queries that surface how it
probably interviews, by analogy: (a) category "founder_background" — the founders'/leaders'
backgrounds and the interview styles of the notable companies they previously worked at,
using any names visible in the evidence digest; (b) category "funding_stage" — the company's
funding stage, size, and recent news; (c) category "comparable_company" — interview
processes at similar-stage companies in the same domain; (d) category "role_norms" —
interview norms for this role and tech stack at seed-to-Series-B startups. Prefer "basic"
depth. Set each query's "category" to one of those four identifiers. Keep queries concrete
and searchable.`,
    prompt: `${describeInput(input)}

What wave 1 already found about the company:
${digest || "(little — lead with founder names if any appear in the company name or URL)"}`,
  });
}

const GATHER_CONCURRENCY = 4;
const COMPRESS_CONCURRENCY = 5;

/**
 * Runs `fn` over `items` in chunks of `size`, re-checking `shouldStop` between
 * chunks so a blown budget stops dispatching new work while in-flight results
 * are kept. `fn` must handle its own errors — a rejection here would discard
 * the whole chunk.
 */
async function mapChunked<T, R>(
  items: T[],
  size: number,
  shouldStop: () => boolean,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    if (shouldStop()) break;
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

/**
 * Stage 2 — Gather. Runs Tavily searches from the plan, then extracts the top
 * few URLs. Reused for the proxy wave: `opts.seenUrls` lets the second wave
 * dedupe against the first, and `opts.stage` labels its progress events.
 */
async function gatherStage(
  plan: Pick<ResearchPlan, "queries">,
  budget: BudgetTracker,
  onProgress: OnProgress,
  preset: EffortPreset,
  opts: { seenUrls?: Set<string>; stage?: PipelineProgressEvent["stage"] } = {}
): Promise<GatheredSource[]> {
  const stage = opts.stage ?? "gather";
  const sources: GatheredSource[] = [];
  const seenUrls = opts.seenUrls ?? new Set<string>();
  const topUrlsForExtract: string[] = [];

  // Searches run a few at a time; mapChunked returns them in plan order, so the
  // dedup and extract-candidate selection below stay deterministic. A failed
  // search contributes nothing rather than killing a run that already spent money.
  const searched = await mapChunked(
    plan.queries,
    GATHER_CONCURRENCY,
    () => budget.shouldStop(),
    async (q) => {
      emit(onProgress, stage, `Searching: ${q.query}`);
      const depth = budget.shouldDegrade() ? "basic" : q.depth;
      try {
        const result = await tavilySearch(q.query, { depth, maxResults: preset.searchResults });
        budget.recordTavilyCredits(stage, tavilySearchCredits(depth), q.query);
        return { category: q.category, results: result.results };
      } catch {
        emit(onProgress, stage, `Search failed, skipping: ${q.query}`);
        return { category: q.category, results: [] };
      }
    }
  );

  for (const { category, results } of searched) {
    for (const r of results) {
      // The same page often ranks for several queries; a duplicate would get
      // its own compress call and double-weight the source at synthesis.
      if (seenUrls.has(r.url)) continue;
      seenUrls.add(r.url);
      sources.push({ url: r.url, title: r.title, category, content: r.content, extracted: false });
    }

    // Reserve the single most relevant result per query as an extract candidate.
    const top = results[0];
    if (
      top &&
      topUrlsForExtract.length < preset.extractLimit &&
      !topUrlsForExtract.includes(top.url)
    ) {
      topUrlsForExtract.push(top.url);
    }
  }

  if (!budget.shouldStop() && topUrlsForExtract.length > 0) {
    emit(onProgress, stage, `Reading ${topUrlsForExtract.length} full pages...`);
    try {
      const extracted = await tavilyExtract(topUrlsForExtract);
      budget.recordTavilyCredits(
        stage,
        tavilyExtractCredits(topUrlsForExtract.length),
        `extract ${topUrlsForExtract.length} urls`
      );
      for (const e of extracted) {
        const existing = sources.find((s) => s.url === e.url);
        if (existing) {
          existing.content = e.rawContent.slice(0, 8000);
          existing.extracted = true;
        }
      }
    } catch {
      // Sources keep their search snippets, which compress passes through verbatim.
      emit(onProgress, stage, "Full-page reading failed — continuing with search snippets");
    }
  }

  return sources;
}

/** Stage 3 — Compress. Cheap model turns raw sources into dense evidence notes. */
const compressedNoteSchema = z.object({
  summary: z.string().describe("Dense summary, ~150-300 tokens, preserving concrete facts"),
});

async function compressStage(
  sources: GatheredSource[],
  budget: BudgetTracker,
  onProgress: OnProgress
): Promise<CompressedNote[]> {
  const usable = sources.filter((s) => s.content && s.content.length >= 40);

  // Notes keep the original source order (slot per source) so the synthesize
  // evidence block is stable regardless of which compress call finishes first.
  const slots: (CompressedNote | undefined)[] = new Array(usable.length);
  const toCompress: { source: GatheredSource; index: number }[] = [];

  const noteFrom = (source: GatheredSource, summary: string): CompressedNote => ({
    sourceUrl: source.url,
    sourceTitle: source.title,
    category: source.category,
    summary,
  });

  usable.forEach((source, index) => {
    if (source.extracted) {
      toCompress.push({ source, index });
    } else {
      // A search snippet is already shorter than the summary we would ask for;
      // "compressing" it costs a call and loses detail. Pass it through as-is.
      slots[index] = noteFrom(source, source.content);
    }
  });

  await mapChunked(
    toCompress,
    COMPRESS_CONCURRENCY,
    () => budget.shouldStop(),
    async ({ source, index }) => {
      emit(onProgress, "compress", `Summarizing: ${source.title || source.url}`);
      try {
        const { summary } = await generateStructured({
          model: "gemini-3.1-flash-lite-preview",
          stage: "compress",
          schema: compressedNoteSchema,
          budget,
          system: `Summarize the given web page content into a dense note for an interview-prep
researcher. Keep concrete, checkable facts: specific questions mentioned, technologies
named, round structure, difficulty signals, dates. Drop filler. Do not editorialize.`,
          prompt: `Source: ${source.title}\nURL: ${source.url}\nCategory: ${source.category}\n\nContent:\n${source.content.slice(0, 6000)}`,
        });
        slots[index] = noteFrom(source, summary);
      } catch {
        // Degraded but grounded: the page's opening beats dropping the source.
        slots[index] = noteFrom(source, source.content.slice(0, 1500));
      }
    }
  );

  return slots.filter((n): n is CompressedNote => n !== undefined);
}

/** Stage 4 — Synthesize. One strong call producing the final structured report. */
async function synthesizeStage(
  input: ResearchInput,
  notes: CompressedNote[],
  budget: BudgetTracker,
  preset: EffortPreset,
  broadened: boolean
): Promise<Report> {
  const evidenceBlock = notes
    .map((n, i) => `[${i + 1}] (${n.category}) ${n.sourceTitle} — ${n.sourceUrl}\n${n.summary}`)
    .join("\n\n");

  // The relaxation block only enters the prompt when the proxy wave fired, so a
  // well-documented company's synthesis is byte-identical to the strict past.
  const basisRules = broadened
    ? `- Direct interview evidence for this company is thin, so proxy evidence is included in
  the notes under categories "founder_background", "funding_stage", "comparable_company",
  and "role_norms". You may predict questions inferred from it. Set a question's "basis" to
  "evidence" only when it is grounded in a direct account of interviewing at THIS company;
  set "basis" to "inferred" when it derives from proxy evidence.
- An inferred question must still cite the proxy-evidence URLs it rests on, and its
  rationale must name the specific proxy signal it leans on (e.g. "the CTO ran Stripe's
  infra loop 2019-2022, so expect practical systems questions" or "Series A infra startups
  of this size typically run a take-home plus a pairing round"). An inferred question is
  never confidence "high".`
    : `- Set every question's "basis" to "evidence".`;

  // Only present on an extension run, where the caller wants fresh questions
  // rather than the ones the report already shows.
  const excludeBlock = input.excludeQuestions.length
    ? `\n\nAlready predicted — do NOT repeat or rephrase any of these:\n${input.excludeQuestions
        .map((q) => `- ${q}`)
        .join("\n")}`
    : "";

  const company = wants(input, "company");
  const loop = wants(input, "loop");
  const skills = wants(input, "skills");
  const experiences = wants(input, "experiences");

  // A section the caller switched off is cut from the schema, so the model is
  // never asked for it and never bills output tokens writing it. The matching
  // rule is cut from the prompt for the same reason.
  const omitMask: Partial<Record<OptionalReportField, true>> = {};
  if (!company) {
    omitMask.companySnapshot = true;
    omitMask.companyExplainer = true;
  }
  if (!loop) omitMask.likelyLoopStructure = true;
  if (!skills) omitMask.skillsRequired = true;
  if (!experiences) omitMask.interviewExperiences = true;

  // The cast keeps the full generated shape in the types: which keys the schema
  // actually carries is a runtime decision, and the reads below are already
  // guarded by the same flags that built the mask.
  const genSchema = reportSchema.omit(omitMask) as unknown as z.ZodType<GeneratedReport>;

  const rules = [
    company &&
      `- Write companyExplainer for someone who has never heard of the company: 2-3 sentences,
  no jargon, no buzzwords, ending with one concrete everyday example of the product in
  action (e.g. "When you buy shoes online and pay by card, Stripe is the service that
  checks the card and moves the money to the store."). companySnapshot stays the
  technical view: stack, scale signals, engineering culture.`,
    `- Set each question's "category" to one of the round identifiers from "Rounds to scout",
  copied character-for-character. Never invent a new identifier or reformat an existing one.`,
    `- Every question must cite at least one evidence URL from the notes it's grounded in.`,
    basisRules,
    `- If evidence for a requested round is thin, say so honestly in the rationale and
  mark confidence "low" rather than fabricating specifics.`,
    loop &&
      `- If the loop-format evidence reveals a round type the user didn't request, include it
  anyway and note in the rationale that it wasn't explicitly requested.`,
    `- Calibrate difficulty to the candidate's years of experience, and bias question topics
  toward their tech stack and the job description when those are provided.`,
    `- Summarize each named interviewer in interviewerSummary using only public evidence in the
  notes; if several were named, cover each briefly.`,
    `- Do not invent citations. Do not invent company facts not present in the notes.`,
    `- Aim for ${preset.questionTarget} questions total across the requested rounds, prioritizing breadth
  across rounds over depth in one. Do not pad: a question you cannot ground in the notes
  does not belong in the report, even if that leaves you short of the range.`,
    `- If an "Already predicted" list is present, treat those questions as taken: never repeat
  one, and never restate one in different words. Cover different ground instead.`,
    skills &&
      `- In skillsRequired, name the skills this specific role actually demands. Do not merely
  restate the job description's bullet list: the value is in the skills the posting leaves
  implicit but the company's product makes unavoidable. If the evidence shows the company
  builds autonomous web agents, a candidate needs to understand agent architecture, tool
  calling, and browser automation, whether or not the posting says so. Work from what the
  company builds, the stack the evidence reveals, the scale it operates at, and the job
  description together. Each "why" is one sentence naming the reason the role needs it,
  grounded in the evidence or the job description — never a restatement of the skill.
  Order them most to least important, and keep each "skill" short enough to read as a
  badge. Do not pad with generic filler ("communication", "problem solving") unless the
  evidence specifically calls it out.`,
    experiences &&
      `- In interviewExperiences, list every first-hand account of interviewing at this company
  that the notes contain — a candidate's write-up, a Glassdoor or Blind or Reddit or
  LeetCode Discuss thread, a personal blog post — using only URLs that appear in the notes.
  Write each "why" for the candidate, naming the role, the level, and how recent the
  account is whenever the notes reveal them (e.g. "A 2024 E5 backend candidate's full loop
  breakdown, round by round"). If the notes contain no first-hand account, return an empty
  array — never invent one, and never fill it with generic listicles or job postings.`,
    `- In importantLinks, pick the ${preset.linksHint} highest-value sources for the candidate to read before
  the interview, using only URLs that appear in the evidence notes. Favour the company's
  engineering blog, its public docs, and interviewer talks or writing over generic
  listicles.${
    experiences ? " Never repeat a URL you already placed in interviewExperiences." : ""
  } Write each
  "why" for the candidate, naming what they will get from it.`,
  ]
    .filter((rule): rule is string => Boolean(rule))
    .join("\n");

  const generated = await generateStructured({
    model: "gemini-3.1-pro-preview",
    stage: "synthesize",
    schema: genSchema,
    budget,
    system: `You are an expert interview coach. Using ONLY the evidence notes provided,
produce a report predicting likely interview questions for the given company and rounds.
Standard rounds follow the PRD §5.3 taxonomy: dsa, system_design, domain_quiz, take_home,
pair_programming, behavioral, hr_culture. The candidate may also have added custom rounds,
which appear verbatim in the "Rounds to scout" list.

Rules:
${rules}`,
    prompt: `${describeInput(input)}

Evidence notes:
${evidenceBlock || "(no evidence gathered — degrade gracefully, mark everything low confidence)"}${excludeBlock}`,
  });

  // Field by field, not a spread of defaults under the result: an omitted
  // section must land as null even if the model (or a test double) hands back
  // more than the schema asked for.
  const report: Report = {
    ...generated,
    companySnapshot: company ? generated.companySnapshot : null,
    companyExplainer: company ? generated.companyExplainer : null,
    likelyLoopStructure: loop ? generated.likelyLoopStructure : null,
    skillsRequired: skills ? generated.skillsRequired : null,
    interviewExperiences: experiences ? generated.interviewExperiences : null,
  };

  // A URL the notes never contained is a hallucination — strip it from both
  // question citations and importantLinks before it reaches the UI as a link.
  const known = new Set(notes.map((n) => n.sourceUrl));

  for (const q of report.questions) {
    q.evidenceUrls = q.evidenceUrls.filter((url) => known.has(url));
    // The prompt requires every question to cite evidence; one that lost all
    // of its citations is ungrounded, so its confidence claim is too.
    if (q.evidenceUrls.length === 0) q.confidence = "low";
    // Belt-and-suspenders on the basis label: default a missing one to the
    // safe reading, and never let an inferred question claim high confidence.
    if (!q.basis) q.basis = "evidence";
    if (q.basis === "inferred" && q.confidence === "high") q.confidence = "medium";
  }

  // `claimed` spans both link sections, so a URL kept as an interview experience
  // cannot appear a second time under Worth reading even if the model repeats it.
  // Only kept URLs are claimed: one dropped at the cap stays available downstream.
  const claimed = new Set<string>();
  const keepLinks = (links: ImportantLink[]) => {
    const kept: ImportantLink[] = [];
    for (const link of links) {
      if (kept.length >= preset.linksMax) break;
      if (!known.has(link.url) || claimed.has(link.url)) continue;
      claimed.add(link.url);
      kept.push(link);
    }
    return kept;
  };

  // Null stays null: an excluded section was never searched for, which is not
  // the same claim as "we looked and found nothing".
  if (report.interviewExperiences) {
    report.interviewExperiences = keepLinks(report.interviewExperiences);
  }
  report.importantLinks = keepLinks(report.importantLinks);

  return report;
}

export interface PipelineResult {
  report: Report;
  budget: BudgetTracker;
}

export async function runResearchPipeline(
  input: ResearchInput,
  onProgress: OnProgress = noopProgress,
  capUsd?: number,
  tracker?: BudgetTracker
): Promise<PipelineResult> {
  const budget = tracker ?? new BudgetTracker(capUsd);
  // The caller's capUsd already accounts for the effort ceiling and the user's
  // balance; the preset only shapes how much output that budget buys.
  const preset = EFFORT_PRESETS[input.effort];

  emit(onProgress, "plan", "Building research plan...");
  const plan = await planStage(input, budget, preset);

  // The planner is told not to produce queries for sections the caller switched
  // off, but a query it plans anyway is a search we would pay for and then throw
  // away. Enforce it here rather than trust the prompt. (Safe after parsing:
  // researchPlanSchema's .min(3) only guards what the model returned.)
  const companyEvidence = wants(input, "company") || wants(input, "skills");
  plan.queries = plan.queries.filter(
    (q) =>
      (q.category !== "company" || companyEvidence) &&
      (q.category !== "loop_format" || wants(input, "loop"))
  );

  emit(onProgress, "gather", "Gathering evidence from the web...");
  // Owned here so the proxy wave can dedupe its results against wave 1.
  const seenUrls = new Set<string>();
  const sources = await gatherStage(plan, budget, onProgress, preset, { seenUrls });

  // When direct interview evidence is thin — an early-stage or low-profile
  // company — broaden into proxy research rather than return an empty report.
  // Skipped once the budget is stretched: a second wave is optional work.
  let broadened = false;
  const density = assessEvidenceDensity(sources);
  if (density.sparse && !budget.shouldDegrade()) {
    emit(
      onProgress,
      "broaden",
      "Public interview data is thin — researching founders, funding stage, and similar companies..."
    );
    try {
      const proxyPlan = await proxyPlanStage(input, sources, budget, preset);
      const proxySources = await gatherStage(
        proxyPlan,
        budget,
        onProgress,
        { ...preset, extractLimit: preset.proxyExtractLimit },
        { seenUrls, stage: "broaden" }
      );
      sources.push(...proxySources);
      broadened = true;
    } catch {
      emit(onProgress, "broaden", "Broadened research failed — continuing with direct evidence");
    }
  }

  emit(onProgress, "compress", `Compressing ${sources.length} sources...`);
  const notes = await compressStage(sources, budget, onProgress);

  emit(onProgress, "synthesize", "Synthesizing final report...");
  const report = await synthesizeStage(input, notes, budget, preset, broadened);
  // Assigned in code, not trusted to the model: "sparse" exactly when the proxy
  // wave ran, so the UI can flag inferred content honestly.
  report.evidenceCoverage = broadened ? "sparse" : "rich";

  emit(onProgress, "done", `Done. Total cost: $${budget.totalUsd.toFixed(4)}`);

  return { report, budget };
}
