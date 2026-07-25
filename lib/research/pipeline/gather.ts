import type { BudgetTracker, EffortPreset } from "../budget";
import { canonicalizePublicUrl, normalizeFaviconUrl } from "../resources";
import { tavilyExtract, tavilyExtractCredits, tavilySearch, tavilySearchCredits } from "../tavily";
import type {
  GatheredSource,
  PipelineProgressEvent,
  ResearchPlan,
  ResourceCandidate,
} from "../types";
import { type OnProgress, emit, mapChunked } from "./shared";

const GATHER_CONCURRENCY = 4;
const MIN_RELIABLE_CONTENT = 40;
const BLOCKED_CONTENT =
  /(?:sign in|log in) to (?:continue|view)|subscribe to (?:continue|read)|access denied|captcha|robots\.txt|enable javascript/i;

export interface GatherResult {
  evidenceSources: GatheredSource[];
  resourceCandidates: ResourceCandidate[];
}

function isAlwaysLinkOnly(url: string): boolean {
  const domain = new URL(url).hostname.replace(/^www\./, "");
  return domain === "linkedin.com" || domain.endsWith(".linkedin.com");
}

function isReliableContent(url: string, content: string): boolean {
  return (
    !isAlwaysLinkOnly(url) &&
    content.trim().length >= MIN_RELIABLE_CONTENT &&
    !BLOCKED_CONTENT.test(content)
  );
}

function addOnce(items: string[], value: string) {
  if (value && !items.includes(value)) items.push(value);
}

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
  opts: {
    seenUrls?: Set<string>;
    candidates?: Map<string, ResourceCandidate>;
    stage?: PipelineProgressEvent["stage"];
  } = {}
): Promise<GatherResult> {
  const stage = opts.stage ?? "gather";
  const sources: GatheredSource[] = [];
  const seenUrls = opts.seenUrls ?? new Set<string>();
  const candidates = opts.candidates ?? new Map<string, ResourceCandidate>();
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
      const credits = tavilySearchCredits(depth);
      const reservation = budget.reserveTavilyCredits(stage, credits, q.query);
      if (!reservation) {
        return { query: q.query, purpose: q.purpose, category: q.category, results: [] };
      }
      try {
        const result = await tavilySearch(q.query, { depth, maxResults: preset.searchResults });
        budget.commitTavilyCredits(reservation, credits, q.query);
        return {
          query: q.query,
          purpose: q.purpose,
          category: q.category,
          results: result.results,
        };
      } catch {
        budget.cancelReservation(reservation);
        emit(onProgress, stage, `Search failed, skipping: ${q.query}`);
        return { query: q.query, purpose: q.purpose, category: q.category, results: [] };
      }
    }
  );

  for (const { query, purpose, category, results } of searched) {
    for (const r of results) {
      const url = canonicalizePublicUrl(r.url);
      if (!url) continue;
      const faviconUrl = normalizeFaviconUrl(r.favicon);

      const existingCandidate = candidates.get(url);
      if (existingCandidate) {
        existingCandidate.score = Math.max(existingCandidate.score, Number(r.score) || 0);
        if (!existingCandidate.title && r.title) existingCandidate.title = r.title;
        if (!existingCandidate.faviconUrl && faviconUrl) existingCandidate.faviconUrl = faviconUrl;
        addOnce(existingCandidate.queries, query);
        addOnce(existingCandidate.purposes, purpose);
        addOnce(existingCandidate.categories, category);
      } else {
        candidates.set(url, {
          url,
          title: r.title || new URL(url).hostname,
          ...(faviconUrl ? { faviconUrl } : {}),
          score: Number(r.score) || 0,
          queries: [query],
          purposes: [purpose],
          categories: [category],
          domain: new URL(url).hostname.replace(/^www\./, ""),
          access: isReliableContent(url, r.content) ? "search_preview" : "link_only",
          extractionOutcome: "not_attempted",
        });
      }

      // The same page often ranks for several queries; a duplicate would get
      // its own compress call and double-weight the source at synthesis.
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);
      if (isReliableContent(url, r.content)) {
        sources.push({ url, title: r.title, category, content: r.content, extracted: false });
      }
    }

    // Reserve the single most relevant result per query as an extract candidate.
    const top = results[0];
    const topUrl = top ? canonicalizePublicUrl(top.url) : null;
    if (
      topUrl &&
      !isAlwaysLinkOnly(topUrl) &&
      candidates.get(topUrl)?.access !== "full_text" &&
      topUrlsForExtract.length < preset.extractLimit &&
      !topUrlsForExtract.includes(topUrl)
    ) {
      topUrlsForExtract.push(topUrl);
    }
  }

  if (!budget.shouldStop() && topUrlsForExtract.length > 0) {
    emit(onProgress, stage, `Reading ${topUrlsForExtract.length} full pages...`);
    const maximumCredits = tavilyExtractCredits(topUrlsForExtract.length);
    const reservation = budget.reserveTavilyCredits(
      stage,
      maximumCredits,
      `extract up to ${topUrlsForExtract.length} urls`
    );
    if (!reservation)
      return { evidenceSources: sources, resourceCandidates: [...candidates.values()] };
    try {
      const extracted = await tavilyExtract(topUrlsForExtract);
      const successfulCredits = tavilyExtractCredits(extracted.length);
      budget.commitTavilyCredits(
        reservation,
        successfulCredits,
        `extract ${extracted.length}/${topUrlsForExtract.length} urls`
      );
      const returned = new Set<string>();
      for (const e of extracted) {
        const url = canonicalizePublicUrl(e.url);
        if (!url || !topUrlsForExtract.includes(url)) continue;
        returned.add(url);
        const candidate = candidates.get(url);
        if (!candidate) continue;
        if (isReliableContent(url, e.rawContent)) {
          candidate.access = "full_text";
          candidate.extractionOutcome = "full_text";
          const existing = sources.find((s) => s.url === url);
          if (existing) {
            existing.content = e.rawContent.slice(0, 8000);
            existing.extracted = true;
          } else {
            sources.push({
              url,
              title: candidate.title,
              category: candidate.categories[0] ?? "other",
              content: e.rawContent.slice(0, 8000),
              extracted: true,
            });
          }
        } else {
          candidate.extractionOutcome = "empty";
        }
      }
      for (const url of topUrlsForExtract) {
        if (!returned.has(url)) {
          const candidate = candidates.get(url);
          if (candidate) candidate.extractionOutcome = "failed";
        }
      }
    } catch {
      budget.cancelReservation(reservation);
      // Sources keep their search snippets, which compress passes through verbatim.
      for (const url of topUrlsForExtract) {
        const candidate = candidates.get(url);
        if (candidate) candidate.extractionOutcome = "failed";
      }
      emit(onProgress, stage, "Full-page reading failed — continuing with search snippets");
    }
  }

  return { evidenceSources: sources, resourceCandidates: [...candidates.values()] };
}
