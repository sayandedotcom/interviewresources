import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BudgetTracker } from "../budget";
import type { ResourceCandidate, TargetProfile } from "../types";

vi.mock("../gemini");

const { generateStructured } = await import("../gemini");
const { classifyCandidates } = await import("./relevance");
const genMock = vi.mocked(generateStructured);

const target: TargetProfile = {
  company: {
    canonicalName: "株式会社みらい",
    aliases: ["みらい", "Mirai"],
    domains: ["mirai.example"],
  },
  role: {
    canonicalTitle: "مهندس برمجيات",
    aliases: ["Software Engineer"],
    description: "Розробка розподілених систем у Києві",
    seniority: "Початковий рівень",
    experience: { minYears: 1, maxYears: 2, raw: "١–٢ سنوات" },
    skills: ["分散システム"],
  },
  location: {
    canonicalName: "Київ",
    aliases: ["Київ", "Kyiv"],
    country: "Україна",
    searchVariants: ["Київ Україна", "Kyiv Ukraine"],
  },
  searchLanguages: ["日本語", "العربية", "Українська"],
};

function candidate(overrides: Partial<ResourceCandidate> = {}): ResourceCandidate {
  return {
    url: "https://source.example/account",
    title: "面接体験",
    preview: "候補者が自分の面接と出題内容を詳しく説明しています。",
    score: 0.8,
    queries: ["query"],
    purposes: ["purpose"],
    categories: ["dsa"],
    domain: "source.example",
    origin: "direct",
    access: "full_text",
    extractionOutcome: "full_text",
    ...overrides,
  };
}

function modelDecision(overrides: Record<string, unknown> = {}) {
  return {
    id: 0,
    tier: "exact",
    score: 94,
    reason: "The account matches the resolved target.",
    matchedCategories: ["dsa", "not_allowed"],
    profile: {
      sourceType: "first_hand_interview",
      resourceKind: "interview_experience",
      companyMatch: "exact",
      role: "مهندس برمجيات",
      roleMatch: "exact",
      level: "Початковий рівень",
      levelMatch: "exact",
      experienceYears: 2,
      experienceMatch: "exact",
      location: "Київ",
      locationMatch: "exact",
      pageIntent: "interview_account",
      questionDetail: "exact",
      firstHand: true,
      contentUsable: true,
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  genMock.mockResolvedValue({ classifications: [modelDecision()] } as never);
});

describe("classifyCandidates", () => {
  it("preserves multilingual target identity and keeps only semantically matched categories", async () => {
    const value = candidate();

    await classifyCandidates([value], target, ["dsa"], new BudgetTracker());

    const prompt = genMock.mock.calls[0][0].prompt;
    expect(prompt).toContain("株式会社みらい");
    expect(prompt).toContain("مهندس برمجيات");
    expect(prompt).toContain("Київ");
    expect(value.relevance).toMatchObject({
      tier: "exact",
      matchedCategories: ["dsa"],
    });
    expect(value.profile?.canSupportReportedQuestion).toBe(true);
  });

  it("never lets a title-only link support a reported question", async () => {
    const value = candidate({ access: "link_only", preview: "" });

    await classifyCandidates([value], target, ["dsa"], new BudgetTracker());

    expect(value.relevance?.tier).toBe("exact");
    expect(value.profile?.access).toBe("link_only");
    expect(value.profile?.canSupportReportedQuestion).toBe(false);
  });

  it("forces proxy-wave material to remain visibly proxy evidence", async () => {
    const value = candidate({ origin: "proxy" });

    await classifyCandidates([value], target, ["dsa"], new BudgetTracker());

    expect(value.relevance?.tier).toBe("proxy");
    expect(value.profile?.proxyEvidence).toBe(true);
  });

  it("downgrades an internally inconsistent exact decision to adjacent", async () => {
    genMock.mockResolvedValue({
      classifications: [
        modelDecision({
          profile: {
            ...modelDecision().profile,
            experienceYears: 8,
            experienceMatch: "mismatch",
          },
        }),
      ],
    } as never);
    const value = candidate();

    await classifyCandidates([value], target, ["dsa"], new BudgetTracker());

    expect(value.relevance?.tier).toBe("adjacent");
    expect(value.relevance?.reason).toContain("conflicting");
  });

  it("replaces snippet relevance when full-page evidence reveals a target mismatch", async () => {
    genMock
      .mockResolvedValueOnce({ classifications: [modelDecision()] } as never)
      .mockResolvedValueOnce({
        classifications: [
          modelDecision({
            tier: "adjacent",
            reason: "The full page states a different experience range.",
            profile: {
              ...modelDecision().profile,
              experienceYears: 8,
              experienceMatch: "mismatch",
            },
          }),
        ],
      } as never);
    const value = candidate();

    await classifyCandidates([value], target, ["dsa"], new BudgetTracker());
    expect(value.relevance?.tier).toBe("exact");

    await classifyCandidates([value], target, ["dsa"], new BudgetTracker(), "classify_extracted");
    expect(value.relevance).toMatchObject({
      tier: "adjacent",
      reason: "The full page states a different experience range.",
    });
  });

  it("rejects a candidate when the model omits its decision", async () => {
    genMock.mockResolvedValue({ classifications: [] } as never);
    const value = candidate();

    await classifyCandidates([value], target, ["dsa"], new BudgetTracker());

    expect(value.relevance?.tier).toBe("reject");
  });
});

describe("runtime hardcoding regression", () => {
  it("contains no target-company, platform, role, or city lookup literals", async () => {
    const files = [
      "lib/research/evidence.ts",
      "lib/research/resources.ts",
      "lib/research/pipeline/gather.ts",
      "lib/research/pipeline/plan.ts",
      "lib/research/pipeline/relevance.ts",
      "lib/research/pipeline/synthesize.ts",
    ];
    const source = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");

    for (const literal of [
      "Deloitte",
      "VMWare",
      "Bengaluru",
      "Bangalore",
      "LeetCode",
      "Glassdoor",
      "LinkedIn",
      "YouTube",
      "full-stack",
      "L4 SWE",
    ]) {
      expect(source).not.toContain(literal);
    }
  });
});
