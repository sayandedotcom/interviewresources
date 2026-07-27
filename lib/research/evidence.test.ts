import { describe, expect, it } from "vitest";

import {
  appendDistinctQuestions,
  directEvidenceProfile,
  isActionableQuestion,
  validateQuestions,
} from "./evidence";
import type { PredictedQuestion, SourceProfile } from "./types";

function profile(overrides: Partial<SourceProfile> = {}): SourceProfile {
  return {
    sourceType: "first_hand_interview",
    resourceKind: "interview_experience",
    access: "full_text",
    companyMatch: "exact",
    role: "Resolved source role",
    roleMatch: "exact",
    level: null,
    levelMatch: "unknown",
    experienceYears: null,
    experienceMatch: "unknown",
    location: null,
    locationMatch: "unknown",
    pageIntent: "interview_account",
    questionDetail: "exact",
    proxyEvidence: false,
    firstHand: true,
    contentUsable: true,
    canSupportReportedQuestion: true,
    ...overrides,
  };
}

function question(overrides: Partial<PredictedQuestion> = {}): PredictedQuestion {
  return {
    category: "dsa",
    question: "Design an LRU cache with O(1) reads and writes.",
    confidence: "high",
    rationale: "Reported by a candidate.",
    prepNote: "Use a hash map and doubly linked list.",
    evidenceUrls: ["https://source.example/account"],
    basis: "evidence",
    ...overrides,
  };
}

describe("source evidence profiles", () => {
  it("accepts only usable first-hand target-company evidence", () => {
    expect(directEvidenceProfile(profile())).toBe(true);
    expect(directEvidenceProfile(profile({ sourceType: "interview_aggregator" }))).toBe(false);
    expect(directEvidenceProfile(profile({ firstHand: false }))).toBe(false);
    expect(directEvidenceProfile(profile({ companyMatch: "mismatch" }))).toBe(false);
    expect(directEvidenceProfile(profile({ contentUsable: false }))).toBe(false);
  });
});

describe("question validation", () => {
  it("downgrades evidence claims backed only by a compilation", () => {
    const url = "https://source.example/compilation";
    const [validated] = validateQuestions(
      [question({ evidenceUrls: [url] })],
      new Map([
        [
          url,
          profile({
            sourceType: "interview_aggregator",
            resourceKind: "other",
            firstHand: false,
            canSupportReportedQuestion: false,
          }),
        ],
      ])
    );

    expect(validated.basis).toBe("baseline");
    expect(validated.confidence).toBe("low");
    expect(validated.evidenceUrls).toEqual([]);
  });

  it("labels a concrete practice prompt reconstructed when evidence disclosed only a topic", () => {
    const url = "https://source.example/account";
    const [validated] = validateQuestions(
      [question({ evidenceUrls: [url] })],
      new Map([[url, profile({ questionDetail: "topic" })]])
    );

    expect(validated.basis).toBe("reconstructed");
    expect(validated.confidence).toBe("medium");
    expect(validated.evidenceUrls).toEqual([url]);
  });

  it("keeps semantic question quality out of language-specific regexes", () => {
    expect(isActionableQuestion("")).toBe(false);
    expect(isActionableQuestion("有向グラフで最短経路を求めてください。")).toBe(true);
    expect(isActionableQuestion("صمّم محدد معدل موزع.")).toBe(true);
  });

  it("does not append a paraphrase of an existing question", () => {
    const existing = question({
      question: "Design a distributed rate limiter using Redis with per-user quotas.",
    });
    const duplicate = question({
      question: "How would you design a Redis distributed rate limiter for per-user quotas?",
    });

    expect(appendDistinctQuestions([existing], [duplicate])).toEqual([existing]);
  });

  it("deduplicates identical non-Latin questions without deleting their characters", () => {
    const existing = question({ question: "配列内の最長増加部分列を求めてください。" });
    const duplicate = question({ question: "配列内の最長増加部分列を求めてください。" });

    expect(appendDistinctQuestions([existing], [duplicate])).toEqual([existing]);
  });
});
