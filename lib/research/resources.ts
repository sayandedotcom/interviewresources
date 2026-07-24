import type { ResearchInput, ResearchResource, ResourceCandidate } from "./types";

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

export function resourceKind(candidate: Pick<ResourceCandidate, "domain" | "url" | "categories">) {
  const domain = candidate.domain.toLowerCase();
  const path = new URL(candidate.url).pathname.toLowerCase();
  const categories = new Set(candidate.categories);

  if (categories.has("interview_experience")) return "interview_experience" as const;
  if (categories.has("interviewer")) return "interviewer" as const;
  if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)vimeo\.com$/.test(domain)) {
    return "video" as const;
  }
  if (/(^|\.)github\.com$|(^|\.)gitlab\.com$|(^|\.)codeberg\.org$/.test(domain)) {
    return "code" as const;
  }
  if (
    /(^|\.)(reddit\.com|glassdoor\.com|teamblind\.com|blind\.com)$/.test(domain) ||
    /discuss|forum|community/.test(path)
  ) {
    return "discussion" as const;
  }
  if (/^docs\.|^developer\.|\/docs(?:\/|$)|\/documentation(?:\/|$)/.test(`${domain}${path}`)) {
    return "company_docs" as const;
  }
  if (
    categories.has("company") &&
    (/^engineering\.|\/engineering(?:\/|$)|\/blog(?:\/|$)|\/tech(?:\/|$)/.test(
      `${domain}${path}`
    ) ||
      path !== "/")
  ) {
    return "company_engineering" as const;
  }
  return "other" as const;
}

function yearSignal(candidate: ResourceCandidate): number {
  const years = `${candidate.title} ${candidate.queries.join(" ")}`.match(/\b20\d{2}\b/g) ?? [];
  return Math.max(0, ...years.map(Number)) / 100_000;
}

function baseRank(candidate: ResourceCandidate, input: ResearchInput): number {
  const haystack =
    `${candidate.title} ${candidate.queries.join(" ")} ${candidate.purposes.join(" ")}`.toLowerCase();
  const company = input.companyName.trim().toLowerCase();
  const role = input.roleContext?.trim().toLowerCase();
  const kind = resourceKind(candidate);
  const categoryBoost =
    kind === "interview_experience"
      ? 0.18
      : kind === "company_engineering" || kind === "company_docs"
        ? 0.12
        : kind === "interviewer"
          ? 0.1
          : kind === "discussion"
            ? 0.08
            : 0.04;

  return (
    candidate.score +
    (company && haystack.includes(company) ? 0.16 : 0) +
    (role && haystack.includes(role) ? 0.1 : 0) +
    categoryBoost +
    yearSignal(candidate)
  );
}

/**
 * Greedy diversity-aware ranking. Repeated domains remain eligible, but each
 * earlier selection from that domain makes a different source more competitive.
 */
export function rankResourceCandidates(
  candidates: ResourceCandidate[],
  input: ResearchInput
): ResourceCandidate[] {
  const remaining = [...candidates];
  const ranked: ResourceCandidate[] = [];
  const domains = new Map<string, number>();

  while (remaining.length > 0) {
    remaining.sort((a, b) => {
      const adjusted = (candidate: ResourceCandidate) =>
        baseRank(candidate, input) - (domains.get(candidate.domain) ?? 0) * 0.14;
      return adjusted(b) - adjusted(a) || a.url.localeCompare(b.url);
    });
    const next = remaining.shift()!;
    ranked.push(next);
    domains.set(next.domain, (domains.get(next.domain) ?? 0) + 1);
  }
  return ranked;
}

export function candidateWhy(candidate: ResourceCandidate): string {
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
    if (ACCESS_STRENGTH[normalized.access] > ACCESS_STRENGTH[current.access]) {
      merged.set(url, {
        ...current,
        ...normalized,
        usedAsEvidence: current.usedAsEvidence || normalized.usedAsEvidence,
      });
    } else if (normalized.usedAsEvidence && !current.usedAsEvidence) {
      merged.set(url, { ...current, usedAsEvidence: true });
    }
  }

  return [...merged.values()].slice(0, limit);
}
