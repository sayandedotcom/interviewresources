import type { PredictedQuestion, SourceProfile } from "./types";

export function directEvidenceProfile(profile: SourceProfile | undefined): boolean {
  return Boolean(
    profile?.sourceType === "first_hand_interview" &&
    profile.firstHand &&
    profile.companyMatch === "exact" &&
    profile.contentUsable &&
    profile.canSupportReportedQuestion
  );
}

/**
 * Extraction order uses the classifier's semantic score and profile. It never
 * tries to rediscover companies, roles, levels, or locations from keywords.
 */
export function extractionPriority(
  profile: SourceProfile | undefined,
  searchScore: number,
  semanticScore = 0
): number {
  if (!profile) return searchScore + semanticScore / 100;
  return (
    searchScore +
    semanticScore / 50 +
    (profile.firstHand ? 0.5 : 0) +
    (profile.companyMatch === "exact" ? 0.25 : 0) +
    (profile.roleMatch === "exact" ? 0.25 : profile.roleMatch === "adjacent" ? 0.08 : 0) +
    (profile.contentUsable ? 0.15 : -0.4) +
    (profile.questionDetail === "exact"
      ? 0.25
      : profile.questionDetail === "partial" || profile.questionDetail === "topic"
        ? 0.1
        : 0)
  );
}

export function isActionableQuestion(question: string): boolean {
  return question.trim().length > 0;
}

/**
 * The model audit handles semantic and technical quality. This deterministic
 * pass enforces citation lineage and basis/confidence invariants even if the
 * audit is unavailable.
 */
export function validateQuestions(
  questions: PredictedQuestion[],
  profilesByUrl: Map<string, SourceProfile | undefined>
): PredictedQuestion[] {
  const validated: PredictedQuestion[] = [];

  for (const original of questions) {
    if (!isActionableQuestion(original.question)) continue;
    const question = { ...original, evidenceUrls: [...original.evidenceUrls] };
    const directUrls = question.evidenceUrls.filter((url) =>
      directEvidenceProfile(profilesByUrl.get(url))
    );
    const exactQuestionUrls = directUrls.filter(
      (url) => profilesByUrl.get(url)?.questionDetail === "exact"
    );
    const reconstructedUrls = directUrls.filter((url) => {
      const detail = profilesByUrl.get(url)?.questionDetail;
      return detail === "partial" || detail === "topic";
    });
    const proxyUrls = question.evidenceUrls.filter((url) => profilesByUrl.get(url)?.proxyEvidence);

    if (question.basis === "evidence") {
      if (exactQuestionUrls.length > 0) {
        question.evidenceUrls = exactQuestionUrls;
        const strongExactSource = exactQuestionUrls.some((url) => {
          const profile = profilesByUrl.get(url);
          return (
            profile?.access === "full_text" &&
            profile.roleMatch === "exact" &&
            profile.levelMatch !== "mismatch" &&
            profile.experienceMatch !== "mismatch" &&
            profile.locationMatch !== "mismatch"
          );
        });
        if (question.confidence === "high" && !strongExactSource) {
          question.confidence = "medium";
        }
      } else if (reconstructedUrls.length > 0) {
        question.basis = "reconstructed";
        question.evidenceUrls = reconstructedUrls;
        if (question.confidence === "high") question.confidence = "medium";
      } else if (proxyUrls.length > 0) {
        question.basis = "inferred";
        question.evidenceUrls = proxyUrls;
        if (question.confidence === "high") question.confidence = "medium";
      } else {
        question.basis = "baseline";
      }
    }

    if (question.basis === "reconstructed") {
      if (reconstructedUrls.length > 0) {
        question.evidenceUrls = reconstructedUrls;
        if (question.confidence === "high") question.confidence = "medium";
      } else if (proxyUrls.length > 0) {
        question.basis = "inferred";
        question.evidenceUrls = proxyUrls;
      } else {
        question.basis = "baseline";
      }
    }
    if (question.basis === "inferred") {
      if (proxyUrls.length === 0) {
        question.basis = "baseline";
      } else {
        question.evidenceUrls = proxyUrls;
        if (question.confidence === "high") question.confidence = "medium";
      }
    }
    if (question.basis === "baseline") {
      question.confidence = "low";
      question.evidenceUrls = [];
    }
    validated.push(question);
  }

  return validated;
}

export function coverageByCategory(
  questions: PredictedQuestion[]
): Record<string, "rich" | "sparse"> {
  const grouped = new Map<string, PredictedQuestion[]>();
  for (const question of questions) {
    const items = grouped.get(question.category) ?? [];
    items.push(question);
    grouped.set(question.category, items);
  }

  return Object.fromEntries(
    [...grouped].map(([category, items]) => {
      const direct = items.filter((item) => item.basis === "evidence");
      const urls = new Set(direct.flatMap((item) => item.evidenceUrls));
      return [category, direct.length >= 2 && urls.size >= 2 ? "rich" : "sparse"];
    })
  );
}

function questionTokens(question: string): Set<string> {
  const value = question.normalize("NFKC").toLocaleLowerCase();
  const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
  return new Set(
    [...segmenter.segment(value)]
      .filter((segment) => segment.isWordLike)
      .map((segment) => segment.segment)
      .filter((token) => Array.from(token).length > 1)
  );
}

function questionSimilarity(a: string, b: string): number {
  const left = questionTokens(a);
  const right = questionTokens(b);
  if (left.size === 0 || right.size === 0) return 0;
  const overlap = [...left].filter((token) => right.has(token)).length;
  return overlap / Math.min(left.size, right.size);
}

/** Keeps extensions from charging for a paraphrase of a question already shown. */
export function appendDistinctQuestions(
  existing: PredictedQuestion[],
  addition: PredictedQuestion[]
): PredictedQuestion[] {
  const merged = [...existing];
  for (const candidate of addition) {
    if (
      merged.some(
        (current) =>
          current.category === candidate.category &&
          questionSimilarity(current.question, candidate.question) >= 0.8
      )
    ) {
      continue;
    }
    merged.push(candidate);
  }
  return merged;
}
