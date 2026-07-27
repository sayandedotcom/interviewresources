import { BudgetTracker, EFFORT_PRESETS } from "../budget";
import { directEvidenceProfile } from "../evidence";
import { rankResourceCandidates } from "../resources";
import { assessEvidenceDensity, sparseRoundCategories } from "../sparsity";
import type { Report, ResearchInput, ResourceCandidate } from "../types";
import { compressStage } from "./compress";
import { gatherStage } from "./gather";
import { gapPlanStage, planStage, proxyPlanStage } from "./plan";
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
  plan.fallbackQueries = plan.fallbackQueries.filter(
    (query) =>
      (query.category !== "company" || companyEvidence) &&
      (query.category !== "loop_format" || wants(input, "loop"))
  );
  const directCategories = [
    ...new Set([
      ...input.interviewTypes,
      ...plan.queries.map((query) => query.category),
      ...plan.fallbackQueries.map((query) => query.category),
    ]),
  ];

  emit(onProgress, "gather", "Gathering evidence from the web...");
  // Owned here so the proxy wave can dedupe its results against wave 1.
  const seenUrls = new Set(input.excludeSourceUrls ?? []);
  const candidates = new Map<string, ResourceCandidate>();
  const gathered = await gatherStage(plan, budget, onProgress, preset, {
    seenUrls,
    candidates,
    input,
    targetProfile: plan.targetProfile,
    allowedCategories: directCategories,
    origin: "direct",
  });
  const sources = gathered.evidenceSources;

  const sparseRounds = sparseRoundCategories(sources, input.interviewTypes);
  if (sparseRounds.length > 0 && !budget.shouldDegrade()) {
    emit(onProgress, "broaden", `Deepening weak rounds: ${sparseRounds.join(", ")}...`);
    const gapPlan = gapPlanStage(plan, sparseRounds, preset);
    if (gapPlan.queries.length > 0) {
      const gapGathered = await gatherStage(
        gapPlan,
        budget,
        onProgress,
        { ...preset, extractLimit: preset.gapExtractLimit },
        {
          seenUrls,
          candidates,
          stage: "broaden",
          input,
          targetProfile: plan.targetProfile,
          allowedCategories: directCategories,
          origin: "gap",
        }
      );
      sources.push(...gapGathered.evidenceSources);
    }
  }

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
      const proxyPlan = await proxyPlanStage(input, plan.targetProfile, sources, budget, preset);
      const proxyGathered = await gatherStage(
        proxyPlan,
        budget,
        onProgress,
        { ...preset, extractLimit: preset.proxyExtractLimit },
        {
          seenUrls,
          candidates,
          stage: "broaden",
          input,
          targetProfile: plan.targetProfile,
          allowedCategories: proxyPlan.queries.map((query) => query.category),
          origin: "proxy",
        }
      );
      sources.push(...proxyGathered.evidenceSources);
      broadened = true;
    } catch {
      emit(onProgress, "broaden", "Broadened research failed — continuing with direct evidence");
    }
  }

  emit(onProgress, "compress", `Compressing ${sources.length} sources...`);
  const notes = await compressStage(sources, budget, onProgress);
  const rankedResources = rankResourceCandidates([...candidates.values()]);
  if (
    (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") ||
    process.env.RESEARCH_DEBUG === "1"
  ) {
    const allCandidates = [...candidates.values()];
    const tierCounts = allCandidates.reduce<Record<string, number>>((counts, candidate) => {
      const tier = candidate.relevance?.tier ?? "unclassified";
      counts[tier] = (counts[tier] ?? 0) + 1;
      return counts;
    }, {});
    console.info(
      `[research:relevance] ${JSON.stringify({
        company: input.companyName,
        discovered: allCandidates.length,
        published: rankedResources.length,
        tiers: tierCounts,
        rejectedExamples: allCandidates
          .filter((candidate) => candidate.relevance?.tier === "reject")
          .slice(0, 8)
          .map((candidate) => ({
            title: candidate.title,
            url: candidate.url,
            reason: candidate.relevance?.reason,
          })),
      })}`
    );
  }

  emit(onProgress, "synthesize", "Synthesizing final report...");
  // Sparse evidence should still produce useful preparation questions. The
  // synthesizer labels those role-standard questions as baseline rather than
  // pretending the company asked them.
  const report = await synthesizeStage(
    input,
    plan.targetProfile,
    notes,
    rankedResources,
    budget,
    preset,
    broadened
  );
  // Assigned in code, not trusted to the model. Search-result volume alone is
  // not rich evidence: the final questions must actually cite direct accounts.
  const evidenceQuestions = report.questions.filter((question) => question.basis === "evidence");
  const directQuestionUrls = new Set(
    evidenceQuestions.flatMap((question) => question.evidenceUrls)
  );
  const directProfiles = notes.filter(
    (note) => directQuestionUrls.has(note.sourceUrl) && directEvidenceProfile(note.profile)
  );
  report.evidenceCoverage =
    density.sparse ||
    Object.values(report.evidenceCoverageByCategory ?? {}).some(
      (coverage) => coverage === "sparse"
    ) ||
    evidenceQuestions.length < 4 ||
    new Set(directProfiles.map((note) => note.sourceUrl)).size < 2
      ? "sparse"
      : "rich";

  emit(onProgress, "done", `Done. Total cost: $${budget.totalUsd.toFixed(4)}`);

  return { report, budget };
}
