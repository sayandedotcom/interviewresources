import { BudgetTracker, EFFORT_PRESETS } from "../budget";
import { rankResourceCandidates } from "../resources";
import { assessEvidenceDensity } from "../sparsity";
import type { Report, ResearchInput, ResourceCandidate } from "../types";
import { compressStage } from "./compress";
import { gatherStage } from "./gather";
import { planStage, proxyPlanStage } from "./plan";
import { type OnProgress, emit, noopProgress, wants } from "./shared";
import { synthesizeStage } from "./synthesize";

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
  const companyEvidence =
    wants(input, "company") || wants(input, "skills") || wants(input, "recruiter");
  plan.queries = plan.queries.filter(
    (q) =>
      (q.category !== "company" || companyEvidence) &&
      (q.category !== "loop_format" || wants(input, "loop"))
  );

  emit(onProgress, "gather", "Gathering evidence from the web...");
  // Owned here so the proxy wave can dedupe its results against wave 1.
  const seenUrls = new Set<string>();
  const candidates = new Map<string, ResourceCandidate>();
  const gathered = await gatherStage(plan, budget, onProgress, preset, { seenUrls, candidates });
  const sources = gathered.evidenceSources;

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
      const proxyGathered = await gatherStage(
        proxyPlan,
        budget,
        onProgress,
        { ...preset, extractLimit: preset.proxyExtractLimit },
        { seenUrls, candidates, stage: "broaden" }
      );
      sources.push(...proxyGathered.evidenceSources);
      broadened = true;
    } catch {
      emit(onProgress, "broaden", "Broadened research failed — continuing with direct evidence");
    }
  }

  emit(onProgress, "compress", `Compressing ${sources.length} sources...`);
  const notes = await compressStage(sources, budget, onProgress);
  const rankedResources = rankResourceCandidates([...candidates.values()], input);

  emit(onProgress, "synthesize", "Synthesizing final report...");
  // Sparse evidence should still produce useful preparation questions. The
  // synthesizer labels those role-standard questions as baseline rather than
  // pretending the company asked them.
  const report = await synthesizeStage(
    input,
    notes,
    rankedResources,
    budget,
    preset,
    broadened,
    density.sparse
  );
  // Assigned in code, not trusted to the model: sparse means direct evidence was
  // thin, even when the budget prevented or the proxy planner failed to broaden.
  report.evidenceCoverage = density.sparse ? "sparse" : "rich";

  emit(onProgress, "done", `Done. Total cost: $${budget.totalUsd.toFixed(4)}`);

  return { report, budget };
}
