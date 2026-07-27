import { beforeEach, describe, expect, it, vi } from "vitest";

import { BudgetTracker } from "../budget";
import type { PredictedQuestion, TargetProfile } from "../types";

vi.mock("../gemini");

const { ResearchStructuredOutputError, generateStructured } = await import("../gemini");
const { auditQuestionsStage } = await import("./audit");
const genMock = vi.mocked(generateStructured);

const target: TargetProfile = {
  company: { canonicalName: "Acme", aliases: ["Acme"], domains: ["acme.example"] },
  role: {
    canonicalTitle: "Engineer",
    aliases: [],
    description: "Build reliable services",
    seniority: null,
    experience: { minYears: null, maxYears: null, raw: null },
    skills: [],
  },
  location: {
    canonicalName: null,
    aliases: [],
    country: null,
    searchVariants: [],
  },
  searchLanguages: [],
};

function question(overrides: Partial<PredictedQuestion> = {}): PredictedQuestion {
  return {
    category: "dsa",
    question: "An underspecified graph problem.",
    confidence: "low",
    rationale: "Reported by the company.",
    prepNote: "Use DFS.",
    evidenceUrls: [],
    basis: "baseline",
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("auditQuestionsStage", () => {
  it("applies technical corrections and removes unsupported reported language", async () => {
    genMock.mockResolvedValue({
      decisions: [
        {
          id: 0,
          keep: true,
          question: "Given a directed graph, return any cycle or an empty list if none exists.",
          confidence: "low",
          rationale: "Role-standard preparation; this is not a reported company question.",
          prepNote: "Track active DFS ancestors and reconstruct the cycle.",
          evidenceUrls: [],
          basis: "baseline",
        },
      ],
    } as never);

    const [audited] = await auditQuestionsStage(target, [], [question()], new BudgetTracker());

    expect(audited.question).toContain("directed graph");
    expect(audited.rationale).toContain("not a reported company question");
    expect(genMock.mock.calls[0][0].stage).toBe("synthesize_audit");
  });

  it("drops a question the auditor cannot repair", async () => {
    genMock.mockResolvedValue({
      decisions: [
        {
          id: 0,
          keep: false,
          question: "",
          confidence: "low",
          rationale: "",
          prepNote: "",
          evidenceUrls: [],
          basis: "baseline",
        },
      ],
    } as never);

    await expect(
      auditQuestionsStage(target, [], [question()], new BudgetTracker())
    ).resolves.toEqual([]);
  });

  it("keeps the deterministic report when the optional audit call fails", async () => {
    genMock.mockRejectedValue(new Error("provider unavailable"));
    const original = question();

    await expect(auditQuestionsStage(target, [], [original], new BudgetTracker())).resolves.toEqual(
      [original]
    );
  });

  it("audits large question sets in bounded five-question batches", async () => {
    genMock.mockResolvedValue({ decisions: [] } as never);
    const questions = Array.from({ length: 21 }, (_, index) =>
      question({ question: `Question ${index + 1}` })
    );

    const audited = await auditQuestionsStage(target, [], questions, new BudgetTracker());

    expect(audited).toEqual(questions);
    expect(genMock).toHaveBeenCalledTimes(5);
    expect(genMock.mock.calls.every((call) => call[0].maxOutputTokens <= 7_200)).toBe(true);
    expect(genMock.mock.calls.every((call) => call[0].thinkingLevel === "low")).toBe(true);
  });

  it("splits a malformed audit batch before retaining unaudited questions", async () => {
    let failed = false;
    genMock.mockImplementation(async () => {
      if (!failed) {
        failed = true;
        throw new ResearchStructuredOutputError(
          "synthesize_audit",
          "test-diagnostic",
          2,
          new Error("truncated")
        );
      }
      return { decisions: [] } as never;
    });
    const questions = Array.from({ length: 4 }, (_, index) =>
      question({ question: `Question ${index + 1}` })
    );

    await expect(auditQuestionsStage(target, [], questions, new BudgetTracker())).resolves.toEqual(
      questions
    );
    expect(genMock).toHaveBeenCalledTimes(3);
  });
});
