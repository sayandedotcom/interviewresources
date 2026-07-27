import type { ResearchResource, ResourceCandidate, ResourceRelevanceTier } from "./types";

const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "dclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "ref_src",
]);

const ACCESS_STRENGTH = {
  link_only: 0,
  search_preview: 1,
  full_text: 2,
} as const;
const RELEVANCE_STRENGTH: Record<ResourceRelevanceTier, number> = {
  exact: 4,
  adjacent: 3,
  general: 2,
  proxy: 1,
};

/** Accepts only web links and returns the stable form used for all comparisons. */
export function canonicalizePublicUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    const canonical = url.toString();
    return url.pathname === "/" && !url.search ? canonical.replace(/\/$/, "") : canonical;
  } catch {
    return null;
  }
}

/** Preserves Tavily's image URL while rejecting mixed-content and unsafe schemes. */
export function normalizeFaviconUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function resourceKind(candidate: Pick<ResourceCandidate, "profile">) {
  return candidate.profile?.resourceKind ?? ("other" as const);
}

function baseRank(candidate: ResourceCandidate): number {
  const tier =
    candidate.relevance?.tier && candidate.relevance.tier !== "reject"
      ? RELEVANCE_STRENGTH[candidate.relevance.tier]
      : 0;
  return (
    tier * 100 +
    (candidate.relevance?.score ?? 0) +
    candidate.score * 10 +
    ACCESS_STRENGTH[candidate.access] * 2
  );
}

/**
 * Greedy diversity-aware ranking. Repeated domains remain eligible, but each
 * earlier selection from that domain makes a different source more competitive.
 */
export function rankResourceCandidates(candidates: ResourceCandidate[]): ResourceCandidate[] {
  const remaining = candidates.filter(
    (candidate) => candidate.relevance && candidate.relevance.tier !== "reject"
  );
  const ranked: ResourceCandidate[] = [];
  const domains = new Map<string, number>();

  while (remaining.length > 0) {
    remaining.sort((a, b) => {
      const adjusted = (candidate: ResourceCandidate) =>
        baseRank(candidate) - (domains.get(candidate.domain) ?? 0) * 15;
      return adjusted(b) - adjusted(a) || a.url.localeCompare(b.url);
    });
    const next = remaining.shift()!;
    ranked.push(next);
    domains.set(next.domain, (domains.get(next.domain) ?? 0) + 1);
  }
  return ranked;
}

export function candidateWhy(candidate: ResourceCandidate): string {
  if (candidate.relevance?.reason) return candidate.relevance.reason;
  const purpose = candidate.purposes.find(Boolean);
  return purpose
    ? `Discovered while researching ${purpose}.`
    : "Discovered as a potentially useful public research link.";
}

/** Canonical merge used by extensions; a weaker access label can never win. */
export function mergeResearchResources(
  existing: ResearchResource[] | undefined,
  addition: ResearchResource[] | undefined,
  limit: number
): ResearchResource[] | undefined {
  if (!existing && !addition) return undefined;
  const merged = new Map<string, ResearchResource>();

  for (const item of [...(existing ?? []), ...(addition ?? [])]) {
    const url = canonicalizePublicUrl(item.url);
    if (!url) continue;
    const normalized = { ...item, url };
    const current = merged.get(url);
    if (!current) {
      merged.set(url, normalized);
      continue;
    }
    const categories = [
      ...new Set([...(current.categories ?? []), ...(normalized.categories ?? [])]),
    ];
    const normalizedTierIsStronger = Boolean(
      normalized.relevanceTier &&
      (!current.relevanceTier ||
        RELEVANCE_STRENGTH[normalized.relevanceTier] > RELEVANCE_STRENGTH[current.relevanceTier])
    );
    const relevanceTier = normalizedTierIsStronger
      ? normalized.relevanceTier
      : current.relevanceTier;
    const relevanceReason = normalizedTierIsStronger
      ? normalized.relevanceReason
      : current.relevanceReason;
    if (ACCESS_STRENGTH[normalized.access] > ACCESS_STRENGTH[current.access]) {
      merged.set(url, {
        ...current,
        ...normalized,
        faviconUrl: current.faviconUrl ?? normalized.faviconUrl,
        usedAsEvidence: current.usedAsEvidence || normalized.usedAsEvidence,
        categories,
        relevanceTier,
        relevanceReason,
      });
    } else if (
      (!current.faviconUrl && normalized.faviconUrl) ||
      (normalized.usedAsEvidence && !current.usedAsEvidence) ||
      categories.length !== (current.categories?.length ?? 0) ||
      normalizedTierIsStronger
    ) {
      merged.set(url, {
        ...current,
        faviconUrl: current.faviconUrl ?? normalized.faviconUrl,
        usedAsEvidence: current.usedAsEvidence || normalized.usedAsEvidence,
        categories,
        relevanceTier,
        relevanceReason,
      });
    }
  }

  return [...merged.values()]
    .sort(
      (a, b) =>
        Number(b.usedAsEvidence) - Number(a.usedAsEvidence) ||
        (b.relevanceTier ? RELEVANCE_STRENGTH[b.relevanceTier] : 0) -
          (a.relevanceTier ? RELEVANCE_STRENGTH[a.relevanceTier] : 0) ||
        ACCESS_STRENGTH[b.access] - ACCESS_STRENGTH[a.access]
    )
    .slice(0, limit);
}
