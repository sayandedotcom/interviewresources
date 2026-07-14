import type { BudgetTracker, EffortPreset } from "../budget";
import { tavilyExtract, tavilyExtractCredits, tavilySearch, tavilySearchCredits } from "../tavily";
import type { GatheredSource, PipelineProgressEvent, ResearchPlan } from "../types";
import { type OnProgress, emit, mapChunked } from "./shared";

const GATHER_CONCURRENCY = 4;

/**
 * Stage 2 — Gather. Runs Tavily searches from the plan, then extracts the top
 * few URLs. Reused for the proxy wave: `opts.seenUrls` lets the second wave
 * dedupe against the first, and `opts.stage` labels its progress events.
 */
export async function gatherStage(
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
