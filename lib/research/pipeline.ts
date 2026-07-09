import { z } from "zod";
import { BudgetTracker } from "./budget";
import { generateStructured } from "./gemini";
import {
  tavilyExtract,
  tavilyExtractCredits,
  tavilySearch,
  tavilySearchCredits,
} from "./tavily";
import {
  type CompressedNote,
  type PipelineProgressEvent,
  type Report,
  type ResearchInput,
  type ResearchPlan,
  reportSchema,
  researchPlanSchema,
} from "./types";

type OnProgress = (event: PipelineProgressEvent) => void;

const noopProgress: OnProgress = () => {};

function emit(onProgress: OnProgress, stage: PipelineProgressEvent["stage"], message: string) {
  onProgress({ stage, message, at: new Date().toISOString() });
}

/** Shared context block so plan and synthesize see the same picture of the candidate. */
function describeInput(input: ResearchInput): string {
  const interviewers = input.interviewers.length
    ? input.interviewers
        .map((i) => `${i.name}${i.url ? ` (${i.url})` : ""}`)
        .join("; ")
    : "not provided";

  return `Company: ${input.companyName}${input.companyUrl ? ` (${input.companyUrl})` : ""}
Interviewers: ${interviewers}
Rounds to scout: ${input.interviewTypes.join(", ")}
Role context: ${input.roleContext ?? "not provided"}
Candidate years of experience: ${input.yearsExperience || "not provided"}
Candidate tech stack: ${input.techStack || "not provided"}
Job description: ${input.jobDescription ? input.jobDescription.slice(0, 2000) : "not provided"}`;
}

/** Stage 1 — Plan. Cheap model, structured output. See PRD §6 stage 1 + §5.3 format discovery. */
async function planStage(input: ResearchInput, budget: BudgetTracker): Promise<ResearchPlan> {
  return generateStructured({
    model: "gemini-3.1-flash-lite-preview",
    stage: "plan",
    schema: researchPlanSchema,
    budget,
    system: `You are a research planner for an interview-prep tool. Given a company and the
rounds the candidate wants scouted, produce a compact search plan: 4-8 targeted web-search
queries. Always include exactly one query with category "loop_format" whose purpose is
discovering the company's actual interview process/rounds (e.g. "<company> interview
process rounds") — this may surface rounds the user did not request. If interviewers are
named, add one query per interviewer (max 2) with category "interviewer" seeking their
public talks, writing, or open-source work — never target linkedin.com directly. Some
rounds are custom identifiers rather than standard categories; plan a discovery query for
each. Use the job description, tech stack, and years of experience to make queries
specific: seniority and named technologies belong in the query text. Prefer "basic" depth;
reserve "advanced" for at most 2-3 of the highest-value queries (company tech stack, and
the primary interview-experience query). Set each query's "category" to the round
identifier it serves, or "company" / "interviewer" / "loop_format". Keep queries concrete
and searchable, not vague.`,
    prompt: describeInput(input),
  });
}

interface GatheredSource {
  url: string;
  title: string;
  category: string;
  content: string;
}

/** Stage 2 — Gather. Runs Tavily searches from the plan, then extracts the top few URLs. */
async function gatherStage(
  plan: ResearchPlan,
  budget: BudgetTracker,
  onProgress: OnProgress,
): Promise<GatheredSource[]> {
  const sources: GatheredSource[] = [];
  const topUrlsForExtract: string[] = [];

  for (const q of plan.queries) {
    if (budget.shouldStop()) break;
    emit(onProgress, "gather", `Searching: ${q.query}`);

    const depth = budget.shouldDegrade() ? "basic" : q.depth;
    const result = await tavilySearch(q.query, { depth, maxResults: 5 });
    budget.recordTavilyCredits("gather", tavilySearchCredits(depth), q.query);

    for (const r of result.results) {
      sources.push({ url: r.url, title: r.title, category: q.category, content: r.content });
    }

    // Reserve the single most relevant result per query as an extract candidate.
    if (result.results[0] && topUrlsForExtract.length < 5) {
      topUrlsForExtract.push(result.results[0].url);
    }
  }

  if (!budget.shouldStop() && topUrlsForExtract.length > 0) {
    emit(onProgress, "gather", `Reading ${topUrlsForExtract.length} full pages...`);
    const extracted = await tavilyExtract(topUrlsForExtract);
    budget.recordTavilyCredits(
      "gather",
      tavilyExtractCredits(topUrlsForExtract.length),
      `extract ${topUrlsForExtract.length} urls`,
    );
    for (const e of extracted) {
      const existing = sources.find((s) => s.url === e.url);
      if (existing) existing.content = e.rawContent.slice(0, 8000);
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
  onProgress: OnProgress,
): Promise<CompressedNote[]> {
  const notes: CompressedNote[] = [];

  for (const source of sources) {
    if (budget.shouldStop()) break;
    if (!source.content || source.content.length < 40) continue;

    emit(onProgress, "compress", `Summarizing: ${source.title || source.url}`);

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

    notes.push({ sourceUrl: source.url, sourceTitle: source.title, category: source.category, summary });
  }

  return notes;
}

/** Stage 4 — Synthesize. One strong call producing the final structured report. */
async function synthesizeStage(
  input: ResearchInput,
  notes: CompressedNote[],
  budget: BudgetTracker,
): Promise<Report> {
  const evidenceBlock = notes
    .map((n, i) => `[${i + 1}] (${n.category}) ${n.sourceTitle} — ${n.sourceUrl}\n${n.summary}`)
    .join("\n\n");

  return generateStructured({
    model: "gemini-3.1-pro-preview",
    stage: "synthesize",
    schema: reportSchema,
    budget,
    system: `You are an expert interview coach. Using ONLY the evidence notes provided,
produce a report predicting likely interview questions for the given company and rounds.
Standard rounds follow the PRD §5.3 taxonomy: dsa, system_design, domain_quiz, take_home,
pair_programming, behavioral, hr_culture. The candidate may also have added custom rounds,
which appear verbatim in the "Rounds to scout" list.

Rules:
- Set each question's "category" to one of the round identifiers from "Rounds to scout",
  copied character-for-character. Never invent a new identifier or reformat an existing one.
- Every question must cite at least one evidence URL from the notes it's grounded in.
- If evidence for a requested round is thin, say so honestly in the rationale and
  mark confidence "low" rather than fabricating specifics.
- If the loop-format evidence reveals a round type the user didn't request, include it
  anyway and note in the rationale that it wasn't explicitly requested.
- Calibrate difficulty to the candidate's years of experience, and bias question topics
  toward their tech stack and the job description when those are provided.
- Summarize each named interviewer in interviewerSummary using only public evidence in the
  notes; if several were named, cover each briefly.
- Do not invent citations. Do not invent company facts not present in the notes.
- Aim for 15-30 questions total across the requested rounds, prioritizing breadth
  across rounds over depth in one.`,
    prompt: `${describeInput(input)}

Evidence notes:
${evidenceBlock || "(no evidence gathered — degrade gracefully, mark everything low confidence)"}`,
  });
}

export interface PipelineResult {
  report: Report;
  budget: BudgetTracker;
}

export async function runResearchPipeline(
  input: ResearchInput,
  onProgress: OnProgress = noopProgress,
): Promise<PipelineResult> {
  const budget = new BudgetTracker();

  emit(onProgress, "plan", "Building research plan...");
  const plan = await planStage(input, budget);

  emit(onProgress, "gather", "Gathering evidence from the web...");
  const sources = await gatherStage(plan, budget, onProgress);

  emit(onProgress, "compress", `Compressing ${sources.length} sources...`);
  const notes = await compressStage(sources, budget, onProgress);

  emit(onProgress, "synthesize", "Synthesizing final report...");
  const report = await synthesizeStage(input, notes, budget);

  emit(onProgress, "done", `Done. Total cost: $${budget.totalUsd.toFixed(4)}`);

  return { report, budget };
}
