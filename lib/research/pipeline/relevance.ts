import { z } from "zod";

import type { BudgetTracker } from "../budget";
import { generateStructured } from "../gemini";
import { describeTargetProfile } from "../target";
import {
  RESOURCE_KINDS,
  type ResourceCandidate,
  type ResourceRelevanceDecision,
  SOURCE_TYPES,
  type SourceProfile,
  type TargetProfile,
} from "../types";
import { mapChunked } from "./shared";

const CLASSIFICATION_BATCH_SIZE = 20;
const CLASSIFICATION_CONCURRENCY = 3;

const profileSchema = z.object({
  sourceType: z.enum(SOURCE_TYPES),
  resourceKind: z.enum(RESOURCE_KINDS),
  companyMatch: z.enum(["exact", "unknown", "mismatch"]),
  role: z.string().max(160).nullable(),
  roleMatch: z.enum(["exact", "adjacent", "unknown", "mismatch"]),
  level: z.string().max(120).nullable(),
  levelMatch: z.enum(["exact", "adjacent", "unknown", "mismatch"]),
  experienceYears: z.number().min(0).max(100).nullable(),
  experienceMatch: z.enum(["exact", "adjacent", "unknown", "mismatch"]),
  location: z.string().max(160).nullable(),
  locationMatch: z.enum(["exact", "adjacent", "unknown", "mismatch"]),
  pageIntent: z.enum([
    "interview_account",
    "company_engineering",
    "job",
    "technical_prep",
    "consumer_support",
    "other",
  ]),
  questionDetail: z.enum(["exact", "partial", "topic", "none"]),
  firstHand: z.boolean(),
  contentUsable: z.boolean(),
});

const classificationSchema = z.object({
  classifications: z
    .array(
      z.object({
        id: z
          .number()
          .int()
          .min(0)
          .max(CLASSIFICATION_BATCH_SIZE - 1),
        tier: z.enum(["exact", "adjacent", "general", "proxy", "reject"]),
        score: z.number().min(0).max(100),
        reason: z.string().min(1).max(500),
        matchedCategories: z.array(z.string()).max(30),
        profile: profileSchema,
      })
    )
    .max(CLASSIFICATION_BATCH_SIZE),
});

function rejected(candidate: ResourceCandidate, reason: string) {
  candidate.relevance = {
    tier: "reject",
    score: 0,
    reason,
    matchedCategories: [],
  };
}

function normalizeDecision(
  candidate: ResourceCandidate,
  result: z.infer<typeof classificationSchema>["classifications"][number],
  targetProfile: TargetProfile,
  allowedCategories: Set<string>
): void {
  let tier: ResourceRelevanceDecision = result.tier;
  let reason = result.reason;
  if (candidate.origin === "proxy" && tier !== "reject") tier = "proxy";
  if (candidate.origin !== "proxy" && tier === "proxy") tier = "general";
  if (tier === "exact") {
    const roleSpecified = Boolean(
      targetProfile.role.canonicalTitle || targetProfile.role.aliases.length > 0
    );
    const senioritySpecified = Boolean(
      targetProfile.role.seniority ||
      targetProfile.role.experience.raw ||
      targetProfile.role.experience.minYears !== null ||
      targetProfile.role.experience.maxYears !== null
    );
    const locationSpecified = Boolean(targetProfile.location.canonicalName);
    const hasConflict = [
      result.profile.roleMatch,
      result.profile.levelMatch,
      result.profile.experienceMatch,
      result.profile.locationMatch,
    ].includes("mismatch");
    const exactTargetSupported =
      result.profile.companyMatch === "exact" &&
      !hasConflict &&
      (!roleSpecified || result.profile.roleMatch === "exact") &&
      (!senioritySpecified ||
        result.profile.levelMatch === "exact" ||
        result.profile.experienceMatch === "exact") &&
      (!locationSpecified || result.profile.locationMatch === "exact");
    if (!exactTargetSupported) {
      tier = result.profile.companyMatch === "exact" ? "adjacent" : "general";
      reason = `Target attributes were incomplete or conflicting. ${reason}`;
    }
  }

  const profile: SourceProfile = {
    ...result.profile,
    access: candidate.access,
    proxyEvidence: candidate.origin === "proxy",
    canSupportReportedQuestion:
      candidate.access !== "link_only" &&
      result.profile.contentUsable &&
      result.profile.firstHand &&
      result.profile.sourceType === "first_hand_interview" &&
      result.profile.companyMatch === "exact" &&
      result.profile.questionDetail !== "none",
  };

  candidate.profile = profile;
  candidate.relevance = {
    tier,
    score: result.score,
    reason,
    matchedCategories: [
      ...new Set(result.matchedCategories.filter((category) => allowedCategories.has(category))),
    ],
  };
}

async function classifyBatch(
  candidates: ResourceCandidate[],
  targetProfile: TargetProfile,
  allowedCategories: string[],
  budget: BudgetTracker,
  stage: "classify" | "classify_extracted"
): Promise<void> {
  const payload = candidates.map((candidate, id) => ({
    id,
    url: candidate.url,
    title: candidate.title,
    text: candidate.preview.slice(0, stage === "classify_extracted" ? 7000 : 2400),
    access: candidate.access,
    origin: candidate.origin,
    discoveredForCategories: candidate.categories,
    queryPurposes: candidate.purposes,
  }));

  try {
    const result = await generateStructured({
      model: "gemini-3.1-flash-lite",
      stage,
      schema: classificationSchema,
      budget,
      maxOutputTokens: Math.min(7_500, 700 + candidates.length * 320),
      system: `You are the semantic publication gate for a global interview-research product.
Classify each candidate against the supplied target profile using the meaning of the text,
including its original language. Do not rely on English keywords, domain reputation, search
rank, or the query that discovered the page.

Rules:
- "exact" requires the target company and target role, with no stated conflict in seniority,
  experience, or location. Unknown details are not evidence of a match.
- "adjacent" is useful same-company material with an unknown or differing role, seniority,
  experience, team, or location. Explain the difference precisely.
- "general" is genuinely useful preparation for the target role or requested round but is not
  evidence about this company's interview.
- "proxy" is allowed only for candidates whose origin is "proxy", and only when the source
  supplies a concrete comparison signal relevant to the target.
- "reject" wrong-company interview accounts, consumer help/account pages, unrelated job pages,
  generic content with no target or round value, and misleading search-result matches.
- A first-hand account is written or spoken by the candidate about their own interview. A
  compilation, guide, aggregator, repost, or second-hand summary is never first-hand.
- questionDetail="exact" only when the source gives a self-contained prompt actually asked in
  that interview. Use "partial" or "topic" when wording or constraints are missing.
- contentUsable means the supplied text contains substantive evidence. A useful title-only link
  may still receive a relevance tier, but its content is not usable as evidence.
- matchedCategories must contain only supplied category identifiers that the page content itself
  supports. Never copy categories merely because a discovery query carried them.
- Assess aliases, local names, levels, experience expectations, locations, and languages from
  the target profile and source meaning. Do not assume one company's level ladder applies to
  another company.
- Return exactly one classification for every id.`,
      prompt: `Target profile:
${describeTargetProfile(targetProfile)}

Allowed category identifiers:
${JSON.stringify(allowedCategories)}

Candidates:
${JSON.stringify(payload)}`,
    });

    const byId = new Map(result.classifications.map((item) => [item.id, item]));
    const allowed = new Set(allowedCategories);
    candidates.forEach((candidate, id) => {
      const decision = byId.get(id);
      if (!decision) {
        rejected(candidate, "Rejected because semantic classification returned no decision.");
        return;
      }
      normalizeDecision(candidate, decision, targetProfile, allowed);
    });
  } catch (error) {
    const reason =
      "Rejected because semantic relevance could not be verified for this research run.";
    for (const candidate of candidates) rejected(candidate, reason);
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        `[research:relevance] ${stage} batch failed`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}

export async function classifyCandidates(
  candidates: ResourceCandidate[],
  targetProfile: TargetProfile,
  allowedCategories: string[],
  budget: BudgetTracker,
  stage: "classify" | "classify_extracted" = "classify"
): Promise<void> {
  const batches: ResourceCandidate[][] = [];
  for (let index = 0; index < candidates.length; index += CLASSIFICATION_BATCH_SIZE) {
    batches.push(candidates.slice(index, index + CLASSIFICATION_BATCH_SIZE));
  }

  await mapChunked(
    batches,
    CLASSIFICATION_CONCURRENCY,
    () => false,
    (batch) => classifyBatch(batch, targetProfile, allowedCategories, budget, stage)
  );
}
