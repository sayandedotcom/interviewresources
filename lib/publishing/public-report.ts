import type { PredictedQuestion, Report } from "@/lib/research/types";

/**
 * How many questions a published page shows. The rest of the report is the
 * paid product.
 *
 * Enough that the page is genuinely useful and worth citing; far short of what
 * a candidate preparing for the loop actually needs.
 */
export const PUBLIC_QUESTION_LIMIT = 6;

/**
 * The minimum evidence-backed questions a report needs before it may be
 * published. Below this the page would be mostly inference, which is the thin
 * programmatic content Google's spam policies target — and it would misrepresent
 * the product, since the whole pitch is that questions carry evidence.
 */
export const MIN_EVIDENCE_QUESTIONS = 4;

/** A question as shown publicly: the claim and its proof, without the coaching. */
export type PublicQuestion = Pick<
  PredictedQuestion,
  "category" | "question" | "confidence" | "rationale" | "evidenceUrls" | "basis"
>;

export type PublicReport = {
  /** Null where the section was switched off for the run that produced this report. */
  companyExplainer: string | null;
  companySnapshot: string | null;
  likelyLoopStructure: string | null;
  evidenceCoverage: "rich" | "sparse" | null;
  questions: PublicQuestion[];
  /** Total in the full report, so the page can be honest about what it withholds. */
  totalQuestions: number;
  importantLinks: Report["importantLinks"];
  interviewExperiences: NonNullable<Report["interviewExperiences"]>;
};

/**
 * Reduces a stored report to what may be shown publicly.
 *
 * The split is deliberate: **give away the proof, sell the depth.** Everything
 * that lets a reader verify the research is public — the question, its
 * confidence, why we predict it, and the evidence URLs behind it. Everything
 * that helps them *pass* the interview is not: `prepNote` (what a strong answer
 * covers), `prepPlan`, `skillsRequired` and `recruiterPitch` never cross this
 * boundary.
 *
 * That ordering matters commercially as well as editorially. Competitors on
 * these SERPs publish unsourced question lists; the sourcing is the one thing
 * they cannot copy, so it is the thing worth showing. The coaching is what
 * people actually pay for.
 *
 * This is the only path from a stored report to a public page. Render from its
 * output, never from the raw payload — a field added to `reportSchema` later
 * stays private by default because it will not appear here.
 */
export function toPublicReport(report: Report): PublicReport {
  const all = report.questions ?? [];

  // Evidence-backed first, then by confidence: the strongest few, not the first
  // few, which would otherwise just mean whatever order the model emitted.
  const confidenceRank = { high: 0, medium: 1, low: 2 } as const;
  const ranked = [...all].sort((a, b) => {
    if (a.basis !== b.basis) {
      if (a.basis === "evidence") return -1;
      if (b.basis === "evidence") return 1;
    }
    return confidenceRank[a.confidence] - confidenceRank[b.confidence];
  });

  return {
    companyExplainer: report.companyExplainer,
    companySnapshot: report.companySnapshot,
    likelyLoopStructure: report.likelyLoopStructure,
    evidenceCoverage: report.evidenceCoverage ?? null,
    questions: ranked.slice(0, PUBLIC_QUESTION_LIMIT).map((q) => ({
      category: q.category,
      question: q.question,
      confidence: q.confidence,
      rationale: q.rationale,
      evidenceUrls: q.evidenceUrls,
      basis: q.basis,
    })),
    totalQuestions: all.length,
    importantLinks: report.importantLinks ?? [],
    interviewExperiences: report.interviewExperiences ?? [],
  };
}

/**
 * Whether a report is substantial enough to publish.
 *
 * Publishing is a manual act, but this stops the obvious own-goal: a page built
 * from a sparse run, with little evidence and a short narrative, is exactly the
 * thin doorway page that earns a manual action rather than traffic.
 */
export function publishability(report: Report): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const questions = report.questions ?? [];
  const evidenceBacked = questions.filter((q) => q.basis === "evidence");

  if (evidenceBacked.length < MIN_EVIDENCE_QUESTIONS) {
    reasons.push(
      `only ${evidenceBacked.length} evidence-backed questions (need ${MIN_EVIDENCE_QUESTIONS})`
    );
  }
  if (report.evidenceCoverage === "sparse") {
    reasons.push("run fell back to proxy research (evidenceCoverage: sparse)");
  }
  if ((report.importantLinks?.length ?? 0) < 3) {
    reasons.push("fewer than 3 important links to cite");
  }
  if ((report.companyExplainer?.trim().length ?? 0) < 200) {
    reasons.push("companyExplainer too short to carry the page");
  }

  return { ok: reasons.length === 0, reasons };
}
