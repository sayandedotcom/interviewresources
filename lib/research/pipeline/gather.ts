import type { BudgetTracker, EffortPreset } from "../budget";
import { extractionPriority } from "../evidence";
import { canonicalizePublicUrl, normalizeFaviconUrl } from "../resources";
import { targetProfileFromInput } from "../target";
import { tavilyExtract, tavilyExtractCredits, tavilySearch, tavilySearchCredits } from "../tavily";
import type {
  GatheredSource,
  PipelineProgressEvent,
  ResearchInput,
  ResearchPlan,
  ResourceCandidate,
  ResourceOrigin,
  TargetProfile,
} from "../types";
import { classifyCandidates } from "./relevance";
import { type OnProgress, emit, mapChunked } from "./shared";

const GATHER_CONCURRENCY = 4;
const MIN_RELIABLE_CONTENT = 40;

export interface GatherResult {
  evidenceSources: GatheredSource[];
  resourceCandidates: ResourceCandidate[];
  rejectedCount: number;
}

function isReliableContent(content: string): boolean {
  return content.trim().length >= MIN_RELIABLE_CONTENT;
}

function addOnce(items: string[], value: string) {
  if (value && !items.includes(value)) items.push(value);
}

function resultFrom(
  candidates: Map<string, ResourceCandidate>,
  waveUrls: Set<string>
): GatherResult {
  const resourceCandidates = [...candidates.values()];
  const evidenceSources = [...waveUrls]
    .map((url): GatheredSource | null => {
      const candidate = candidates.get(url);
      const relevance = candidate?.relevance;
      if (
        !candidate ||
        !relevance ||
        relevance.tier === "reject" ||
        !candidate.profile?.contentUsable ||
        !isReliableContent(candidate.preview) ||
        relevance.matchedCategories.length === 0
      ) {
        return null;
      }
      const categories = relevance.matchedCategories;
      return {
        url,
        title: candidate.title,
        category: categories[0],
        categories,
        content: candidate.preview.slice(0, 8000),
        extracted: candidate.extractionOutcome === "full_text",
        profile: candidate.profile,
      };
    })
    .filter((source): source is GatheredSource => source !== null);

  return {
    evidenceSources,
    resourceCandidates,
    rejectedCount: resourceCandidates.filter((candidate) => candidate.relevance?.tier === "reject")
      .length,
  };
}

/**
 * Stage 2: discover URLs, classify snippets semantically, extract the strongest
 * candidates, then classify the extracted text again. Search queries provide
 * recall; they never supply relevance or evidence categories by themselves.
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
    input?: ResearchInput;
    targetProfile?: TargetProfile;
    allowedCategories?: string[];
    origin?: ResourceOrigin;
  } = {}
): Promise<GatherResult> {
  const stage = opts.stage ?? "gather";
  const seenUrls = opts.seenUrls ?? new Set<string>();
  const candidates = opts.candidates ?? new Map<string, ResourceCandidate>();
  const origin = opts.origin ?? "direct";
  const targetProfile =
    opts.targetProfile ?? (opts.input ? targetProfileFromInput(opts.input) : undefined);
  const allowedCategories = [
    ...new Set(opts.allowedCategories ?? plan.queries.map((query) => query.category)),
  ];
  const waveUrls = new Set<string>();

  const searched = await mapChunked(
    plan.queries,
    GATHER_CONCURRENCY,
    () => budget.shouldStop(),
    async (query) => {
      emit(onProgress, stage, `Searching: ${query.query}`);
      const depth = budget.shouldDegrade() ? "basic" : query.depth;
      const credits = tavilySearchCredits(depth);
      const reservation = budget.reserveTavilyCredits(stage, credits, query.query);
      if (!reservation) {
        return { ...query, results: [] };
      }
      try {
        const result = await tavilySearch(query.query, {
          depth,
          maxResults: preset.searchResults,
          includeDomains: query.includeDomains,
          excludeDomains: query.excludeDomains,
          startDate: query.startDate,
        });
        budget.commitTavilyCredits(reservation, credits, query.query);
        return { ...query, results: result.results };
      } catch {
        budget.cancelReservation(reservation);
        emit(onProgress, stage, `Search failed, skipping: ${query.query}`);
        return { ...query, results: [] };
      }
    }
  );

  for (const { query, purpose, category, results } of searched) {
    for (const result of results) {
      const url = canonicalizePublicUrl(result.url);
      if (!url || (seenUrls.has(url) && !candidates.has(url))) continue;

      const faviconUrl = normalizeFaviconUrl(result.favicon);
      const resultAccess = isReliableContent(result.content) ? "search_preview" : "link_only";
      const existing = candidates.get(url);
      if (existing) {
        existing.score = Math.max(existing.score, Number(result.score) || 0);
        if (!existing.title && result.title) existing.title = result.title;
        if (result.content.length > existing.preview.length) {
          existing.preview = result.content.slice(0, 8000);
        }
        if (!existing.faviconUrl && faviconUrl) existing.faviconUrl = faviconUrl;
        addOnce(existing.queries, query);
        addOnce(existing.purposes, purpose);
        addOnce(existing.categories, category);
        if (existing.access === "link_only" && resultAccess === "search_preview") {
          existing.access = "search_preview";
        }
        if (!seenUrls.has(url) && existing.relevance?.tier === "reject") {
          existing.origin = origin;
        }
      } else {
        candidates.set(url, {
          url,
          title: result.title || new URL(url).hostname,
          preview: result.content.slice(0, 8000),
          ...(faviconUrl ? { faviconUrl } : {}),
          score: Number(result.score) || 0,
          queries: [query],
          purposes: [purpose],
          categories: [category],
          domain: new URL(url).hostname.replace(/^www\./u, ""),
          origin,
          access: resultAccess,
          extractionOutcome: "not_attempted",
        });
      }

      if (!seenUrls.has(url)) waveUrls.add(url);
    }
  }

  const waveCandidates = [...waveUrls]
    .map((url) => candidates.get(url))
    .filter((candidate): candidate is ResourceCandidate => candidate !== undefined);

  if (!targetProfile) {
    for (const candidate of waveCandidates) {
      candidate.relevance = {
        tier: "reject",
        score: 0,
        reason: "Rejected because no target profile was available.",
        matchedCategories: [],
      };
    }
  } else {
    emit(onProgress, stage, `Checking ${waveCandidates.length} results against the target...`);
    await classifyCandidates(waveCandidates, targetProfile, allowedCategories, budget);
  }

  for (const candidate of waveCandidates) {
    if (candidate.relevance?.tier !== "reject") seenUrls.add(candidate.url);
  }

  const extractCandidates = waveCandidates
    .filter(
      (candidate) => candidate.relevance?.tier !== "reject" && candidate.access !== "full_text"
    )
    .sort(
      (left, right) =>
        extractionPriority(right.profile, right.score, right.relevance?.score) -
          extractionPriority(left.profile, left.score, left.relevance?.score) ||
        left.url.localeCompare(right.url)
    )
    .slice(0, preset.extractLimit);
  const extractUrls = extractCandidates.map((candidate) => candidate.url);

  if (!budget.shouldStop() && extractUrls.length > 0) {
    emit(onProgress, stage, `Reading ${extractUrls.length} full pages...`);
    const maximumCredits = tavilyExtractCredits(extractUrls.length, preset.extractDepth);
    const reservation = budget.reserveTavilyCredits(
      stage,
      maximumCredits,
      `extract up to ${extractUrls.length} urls`
    );

    if (reservation) {
      try {
        const focus = [
          targetProfile?.company.canonicalName,
          targetProfile?.role.canonicalTitle,
          targetProfile?.role.seniority,
          targetProfile?.location.canonicalName,
          ...allowedCategories,
          ...plan.queries.map((query) => query.purpose),
        ]
          .filter((value): value is string => Boolean(value))
          .join("; ")
          .slice(0, 1600);
        const extracted = await tavilyExtract(extractUrls, {
          query: focus,
          depth: preset.extractDepth,
        });
        const successfulCredits = tavilyExtractCredits(extracted.length, preset.extractDepth);
        budget.commitTavilyCredits(
          reservation,
          successfulCredits,
          `extract ${extracted.length}/${extractUrls.length} urls`
        );

        const returned = new Set<string>();
        const extractedCandidates: ResourceCandidate[] = [];
        for (const item of extracted) {
          const url = canonicalizePublicUrl(item.url);
          if (!url || !waveUrls.has(url) || !extractUrls.includes(url)) continue;
          returned.add(url);
          const candidate = candidates.get(url);
          if (!candidate) continue;
          if (isReliableContent(item.rawContent)) {
            candidate.preview = item.rawContent.slice(0, 8000);
            candidate.access = "full_text";
            candidate.extractionOutcome = "full_text";
            extractedCandidates.push(candidate);
          } else {
            candidate.extractionOutcome = "empty";
          }
        }
        for (const url of extractUrls) {
          if (!returned.has(url)) {
            const candidate = candidates.get(url);
            if (candidate) candidate.extractionOutcome = "failed";
          }
        }

        if (targetProfile && extractedCandidates.length > 0) {
          await classifyCandidates(
            extractedCandidates,
            targetProfile,
            allowedCategories,
            budget,
            "classify_extracted"
          );
          for (const candidate of extractedCandidates) {
            if (candidate.relevance?.tier === "reject") seenUrls.delete(candidate.url);
          }
        }
      } catch {
        budget.cancelReservation(reservation);
        for (const url of extractUrls) {
          const candidate = candidates.get(url);
          if (candidate) candidate.extractionOutcome = "failed";
        }
        emit(onProgress, stage, "Full-page reading failed; continuing with search previews");
      }
    }
  }

  const output = resultFrom(candidates, waveUrls);
  const waveRejected = waveCandidates.filter(
    (candidate) => candidate.relevance?.tier === "reject"
  ).length;
  if (waveRejected > 0) {
    emit(
      onProgress,
      stage,
      `Relevance gate retained ${waveCandidates.length - waveRejected} and rejected ${waveRejected} off-target results`
    );
  }
  return output;
}
