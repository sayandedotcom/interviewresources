/**
 * Cross-page duplicate-content measurement for published company pages.
 *
 * The audit's quality gate for this route family: *if pages are published and
 * 60%+ of their body text is identical across companies, the approach has
 * failed regardless of rankings — check this before checking traffic.*
 *
 * That matters more here than almost anywhere else on the site. Per-company
 * pages are a programmatic content pattern, and the same template with a
 * company name swapped in is precisely what Google's spam policies target. It
 * would also make these pages indistinguishable from the unsourced question
 * lists they are meant to displace.
 */

/** Shingle size. 5 is long enough that shared stock phrases ("the interview
 * process") do not register as duplication, short enough to catch a reworded
 * template. */
const SHINGLE = 5;

function shingles(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const out = new Set<string>();
  for (let i = 0; i + SHINGLE <= words.length; i++) {
    out.add(words.slice(i, i + SHINGLE).join(" "));
  }
  return out;
}

/**
 * Overlap of `a` against `b`, 0-1: the share of `a`'s content that also appears
 * in `b`.
 *
 * Containment rather than Jaccard on purpose — a short page duplicated wholesale
 * inside a long one is still duplication, but Jaccard would score it low because
 * the union is dominated by the longer text.
 */
export function overlapRatio(a: string, b: string): number {
  const sa = shingles(a);
  const sb = shingles(b);
  if (sa.size === 0) return 0;

  let shared = 0;
  for (const s of sa) if (sb.has(s)) shared++;
  return shared / sa.size;
}

export type SimilarityFinding = {
  a: string;
  b: string;
  ratio: number;
};

/**
 * Every pair of pages whose body text overlaps by more than `threshold`.
 *
 * Returns pairs rather than a single score so the output names which two pages
 * to fix. Empty means the set passes.
 */
export function findDuplicatePairs(
  pages: { id: string; text: string }[],
  threshold = 0.6
): SimilarityFinding[] {
  const findings: SimilarityFinding[] = [];

  for (let i = 0; i < pages.length; i++) {
    for (let j = i + 1; j < pages.length; j++) {
      // Max of both directions: duplication is symmetric even when length is not.
      const ratio = Math.max(
        overlapRatio(pages[i].text, pages[j].text),
        overlapRatio(pages[j].text, pages[i].text)
      );
      if (ratio > threshold) {
        findings.push({ a: pages[i].id, b: pages[j].id, ratio });
      }
    }
  }

  return findings.sort((x, y) => y.ratio - x.ratio);
}

/**
 * The prose a published page contributes, excluding shared chrome.
 *
 * Only the fields that vary per company: the narrative, the loop description,
 * and each question with its rationale. Boilerplate ("How this page was
 * researched") is excluded deliberately — it is identical by design and would
 * mask real duplication in the parts that are supposed to differ.
 */
export function publishedPageBodyText(report: {
  companyExplainer: string | null;
  companySnapshot: string | null;
  likelyLoopStructure: string | null;
  questions: { question: string; rationale: string }[];
}): string {
  return [
    report.companyExplainer ?? "",
    report.companySnapshot ?? "",
    report.likelyLoopStructure ?? "",
    ...report.questions.flatMap((q) => [q.question, q.rationale]),
  ]
    .filter(Boolean)
    .join(" ");
}
