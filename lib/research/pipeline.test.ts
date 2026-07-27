import { beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";

import type { BudgetTracker, GeminiModel } from "./budget";
import {
  DEFAULT_SECTIONS,
  type PipelineProgressEvent,
  type ProxyPlan,
  type Report,
  type ResearchInput,
  type ResearchPlan,
  type TargetProfile,
} from "./types";

vi.mock("./gemini");
vi.mock("./tavily", async (importOriginal) => {
  // Keep the real credit-costing functions; only the network calls are faked.
  const actual = await importOriginal<typeof import("./tavily")>();
  return { ...actual, tavilySearch: vi.fn(), tavilyExtract: vi.fn() };
});

const { ResearchStructuredOutputError, generateStructured } = await import("./gemini");
const { tavilyExtract, tavilySearch } = await import("./tavily");
const { runResearchPipeline } = await import("./pipeline");

const genMock = vi.mocked(generateStructured);
const searchMock = vi.mocked(tavilySearch);
const extractMock = vi.mocked(tavilyExtract);

const input: ResearchInput = {
  companyName: "Stripe",
  interviewers: [],
  interviewTypes: ["dsa"],
  fullLoop: false,
  excludeQuestions: [],
  effort: "medium",
  sections: [...DEFAULT_SECTIONS],
};

const targetProfile: TargetProfile = {
  company: {
    canonicalName: "Stripe",
    aliases: ["Stripe"],
    domains: ["stripe.com"],
  },
  role: {
    canonicalTitle: null,
    aliases: [],
    description: null,
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
  searchLanguages: ["English"],
};

function plan(overrides: Partial<ResearchPlan> = {}): ResearchPlan {
  const base: ResearchPlan = {
    resolvedCompanyDomain: "stripe.com",
    companySummaryQuery: "what does stripe do",
    targetProfile,
    queries: [
      {
        query: "stripe interview process",
        purpose: "loop",
        depth: "advanced",
        category: "loop_format",
        excludeDomains: ["support.stripe.com", "accounts.stripe.com"],
      },
      {
        query: "stripe dsa questions",
        purpose: "dsa",
        depth: "basic",
        category: "dsa",
        excludeDomains: ["support.stripe.com", "accounts.stripe.com"],
      },
      {
        query: "stripe tech stack",
        purpose: "company",
        depth: "advanced",
        category: "company",
        excludeDomains: ["support.stripe.com", "accounts.stripe.com"],
      },
    ],
    fallbackQueries: [],
  };
  return { ...base, ...overrides };
}

function report(overrides: Partial<Report> = {}): Report {
  return {
    companySnapshot: "Payments",
    companyExplainer: "Stripe moves money when you pay online.",
    likelyLoopStructure: "Phone screen then onsite",
    interviewerSummary: null,
    questions: [
      {
        category: "dsa",
        question: "LRU cache",
        confidence: "high",
        rationale: "reported",
        prepNote: "O(1)",
        evidenceUrls: ["https://a.dev"],
        basis: "evidence",
      },
    ],
    skillsRequired: [{ skill: "Idempotency", why: "Payments retry" }],
    prepPlan: ["Drill LRU"],
    interviewExperiences: [],
    importantLinks: [],
    ...overrides,
  };
}

function searchResult(url: string, content = "x".repeat(200), favicon?: string) {
  return {
    title: `Stripe software engineer interview resource | ${url}`,
    url,
    content,
    score: 0.9,
    ...(favicon ? { favicon } : {}),
  };
}

function proxyPlan(overrides: Partial<ProxyPlan> = {}): ProxyPlan {
  return {
    queries: [
      {
        query: "founder background",
        purpose: "founders",
        depth: "basic",
        category: "founder_background",
      },
      {
        query: "comparable startup interview",
        purpose: "peers",
        depth: "basic",
        category: "comparable_company",
      },
    ],
    ...overrides,
  };
}

function promptJson<T>(prompt: string, marker: string): T {
  return JSON.parse(prompt.slice(prompt.indexOf(marker) + marker.length)) as T;
}

function classificationFor(prompt: string) {
  const candidates = promptJson<
    Array<{
      id: number;
      url: string;
      title: string;
      text: string;
      access: "full_text" | "search_preview" | "link_only";
      origin: "direct" | "gap" | "proxy";
      discoveredForCategories: string[];
    }>
  >(prompt, "Candidates:\n");

  return {
    classifications: candidates.map((candidate) => {
      const rejected =
        candidate.url.includes("deloitte.example") || candidate.url.includes("support.stripe.com");
      return {
        id: candidate.id,
        tier: rejected ? ("reject" as const) : candidate.origin === "proxy" ? "proxy" : "exact",
        score: rejected ? 0 : 90,
        reason: rejected
          ? "The source is off target."
          : "The source is semantically relevant to the target.",
        matchedCategories: rejected ? [] : candidate.discoveredForCategories,
        profile: {
          sourceType: "first_hand_interview" as const,
          resourceKind: "interview_experience" as const,
          companyMatch: rejected ? ("mismatch" as const) : ("exact" as const),
          role: "Software engineering",
          roleMatch: "adjacent" as const,
          level: null,
          levelMatch: "unknown" as const,
          experienceYears: null,
          experienceMatch: "unknown" as const,
          location: null,
          locationMatch: "unknown" as const,
          pageIntent: rejected ? ("other" as const) : ("interview_account" as const),
          questionDetail: candidate.access === "link_only" ? ("none" as const) : ("exact" as const),
          firstHand: !rejected,
          contentUsable: !rejected && candidate.access !== "link_only",
        },
      };
    }),
  };
}

function auditFor(prompt: string) {
  const questions = promptJson<
    Array<{
      id: number;
      question: string;
      confidence: "high" | "medium" | "low";
      rationale: string;
      prepNote: string;
      evidenceUrls: string[];
      basis: "evidence" | "reconstructed" | "inferred" | "baseline";
    }>
  >(prompt, "Questions to audit:\n");
  return {
    decisions: questions.map(({ id, ...question }) => ({ id, keep: true, ...question })),
  };
}

function generatedQuestionBatch(
  prompt: string,
  system: string,
  seeds: Report["questions"] = report().questions
): Report["questions"] {
  const category = prompt.match(/^Round identifier: (.+)$/m)?.[1] ?? seeds[0]?.category ?? "dsa";
  const count = Number(prompt.match(/^Questions required in this batch: (\d+)$/m)?.[1] ?? 0);
  const batchIndex = Number(system.match(/This is batch (\d+) of \d+/)?.[1] ?? 1);
  const offset = (batchIndex - 1) * 5;
  const fallback = seeds[0] ?? report().questions[0];

  return Array.from({ length: count }, (_, index) => {
    const seed = seeds[offset + index] ?? seeds[(offset + index) % seeds.length] ?? fallback;
    const ordinal = offset + index + 1;
    return {
      ...seed,
      category,
      question:
        `Implement ${category}variant${ordinal} with input${ordinal}, output${ordinal}, ` +
        `and constraint${ordinal}.`,
    };
  });
}

/**
 * Non-sparse evidence: many distinct substantive sources across queries, with
 * the top of each extracted. Used by tests that must not trip the proxy wave.
 */
function nonSparseSearches() {
  const firsthand =
    "My interview at Stripe included an onsite where they asked me to design a cache. ".repeat(4);
  searchMock.mockImplementation(async (q) => ({
    query: q,
    results: Array.from({ length: 3 }, (_, i) =>
      searchResult(`https://candidate-blog.dev/${q.replaceAll(" ", "-")}-${i}`, firsthand)
    ),
  }));
  extractMock.mockImplementation(async (urls) =>
    urls.map((url) => ({ url, rawContent: `${firsthand}${"R".repeat(500)}` }))
  );
}

/**
 * Drives generateStructured stage-by-stage, recording a caller-chosen token cost
 * into the real BudgetTracker so budget-threshold behaviour is exercised for
 * real rather than stubbed.
 */
function stubStages(opts: {
  plan?: ResearchPlan;
  proxyPlan?: ProxyPlan;
  report?: Report;
  topupQuestions?: Report["questions"];
  tokensByStage?: Partial<Record<string, [number, number]>>;
  model?: GeminiModel;
}) {
  genMock.mockImplementation(async (args) => {
    const budget = args.budget as BudgetTracker;
    const [inTok, outTok] = opts.tokensByStage?.[args.stage] ?? [0, 0];
    budget.recordLlmCall(args.stage, args.model, inTok, outTok);

    if (args.stage === "plan") return (opts.plan ?? plan()) as never;
    if (args.stage === "plan_proxy") return (opts.proxyPlan ?? proxyPlan()) as never;
    if (args.stage === "classify" || args.stage === "classify_extracted") {
      return classificationFor(args.prompt) as never;
    }
    if (args.stage === "compress") return { summary: `summary of ${args.stage}` } as never;
    if (args.stage === "synthesize" || args.stage.startsWith("synthesize_core_")) {
      const source = opts.report ?? report();
      const shape = (args.schema as unknown as z.ZodObject<z.ZodRawShape>).shape;
      return Object.fromEntries(
        Object.keys(shape).map((key) => [key, source[key as keyof Report]])
      ) as never;
    }
    if (args.stage === "synthesize_experiences") {
      return {
        interviewExperiences: (opts.report ?? report()).interviewExperiences ?? [],
      } as never;
    }
    if (args.stage === "synthesize_links") {
      return { importantLinks: (opts.report ?? report()).importantLinks } as never;
    }
    if (args.stage === "synthesize_questions") {
      return { questions: (opts.report ?? report()).questions } as never;
    }
    if (args.stage === "synthesize_topup" || args.stage === "synthesize_repair") {
      return {
        questions: generatedQuestionBatch(
          args.prompt,
          args.system,
          opts.topupQuestions ?? (opts.report ?? report()).questions
        ),
      } as never;
    }
    if (args.stage === "synthesize_audit") return auditFor(args.prompt) as never;
    throw new Error(`unexpected stage ${args.stage}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  searchMock.mockResolvedValue({ query: "q", results: [searchResult("https://a.dev")] });
  extractMock.mockResolvedValue([]);
});

describe("stage orchestration", () => {
  it("runs plan → gather → compress → synthesize and returns report plus budget", async () => {
    stubStages({});

    const { report: out, budget } = await runResearchPipeline(input);

    expect(out.companySnapshot).toBe("Payments");
    expect(budget.breakdown().length).toBeGreaterThan(0);

    const stages = genMock.mock.calls.map((c) => c[0].stage);
    expect(stages[0]).toBe("plan");
    expect(stages).toContain("synthesize_topup");
    expect(stages).toContain("synthesize_audit");
    expect(stages.at(-1)).toBe("synthesize_links");
  });

  it("uses the cheap model to plan and compress, and the strong model to synthesize", async () => {
    stubStages({});
    // Compression only runs for extracted pages, so give the top hit a full page.
    extractMock.mockResolvedValue([{ url: "https://a.dev", rawContent: "F".repeat(500) }]);

    await runResearchPipeline(input);

    const byStage = Object.fromEntries(genMock.mock.calls.map((c) => [c[0].stage, c[0].model]));
    expect(byStage.plan).toBe("gemini-3.1-flash-lite");
    expect(byStage.classify).toBe("gemini-3.1-flash-lite");
    expect(byStage.compress).toBe("gemini-3.1-flash-lite");
    expect(byStage.synthesize).toBe("gemini-3.1-pro-preview");
    expect(byStage.synthesize_experiences).toBe("gemini-3.5-flash");
    expect(byStage.synthesize_links).toBe("gemini-3.5-flash");
    expect(byStage.synthesize_questions).toBe("gemini-3.5-flash");
    expect(byStage.synthesize_topup).toBe("gemini-3.5-flash");
    expect(byStage.synthesize_audit).toBe("gemini-3.5-flash");
  });

  it("emits a progress event for each stage, ending in done", async () => {
    stubStages({});
    const events: PipelineProgressEvent[] = [];

    await runResearchPipeline(input, (e) => events.push(e));

    const stages = events.map((e) => e.stage);
    expect(stages[0]).toBe("plan");
    expect(stages).toContain("gather");
    expect(stages).toContain("compress");
    expect(stages).toContain("synthesize");
    expect(stages.at(-1)).toBe("done");
    expect(events.every((e) => !Number.isNaN(Date.parse(e.at)))).toBe(true);
  });

  it("runs without a progress callback", async () => {
    stubStages({});
    await expect(runResearchPipeline(input)).resolves.toBeDefined();
  });

  it("passes the candidate's context into the plan prompt", async () => {
    stubStages({});

    await runResearchPipeline({
      ...input,
      yearsExperience: "8",
      techStack: "Rust, Kafka",
      roleContext: "Staff SRE",
      interviewers: [{ name: "Ada Lovelace", url: "https://ada.dev" }],
    });

    const planPrompt = genMock.mock.calls.find((c) => c[0].stage === "plan")![0].prompt;
    expect(planPrompt).toContain("Staff SRE");
    expect(planPrompt).toContain("Rust, Kafka");
    expect(planPrompt).toContain("Ada Lovelace (https://ada.dev)");
  });

  it("passes location, teamContext, and recruiterNotes into the plan prompt", async () => {
    stubStages({});

    await runResearchPipeline({
      ...input,
      location: "Bengaluru, India",
      teamContext: "AWS EC2",
      recruiterNotes: "Phone screen done, next is 2 coding rounds + 1 system design",
    });

    const planPrompt = genMock.mock.calls.find((c) => c[0].stage === "plan")![0].prompt;
    expect(planPrompt).toContain("Bengaluru, India");
    expect(planPrompt).toContain("AWS EC2");
    expect(planPrompt).toContain("Phone screen done, next is 2 coding rounds + 1 system design");
  });

  it("truncates a huge job description before it reaches the model", async () => {
    stubStages({});

    await runResearchPipeline({ ...input, jobDescription: "J".repeat(50_000) });

    const planPrompt = genMock.mock.calls.find((c) => c[0].stage === "plan")![0].prompt;
    expect(planPrompt.split("Job description: ")[1]).toHaveLength(2000);
  });

  it("scales the planned query count with effort", async () => {
    stubStages({});

    await runResearchPipeline({ ...input, effort: "high" });
    expect(genMock.mock.calls.find((c) => c[0].stage === "plan")![0].system).toContain(
      "12-18 targeted web-search"
    );

    vi.clearAllMocks();
    searchMock.mockResolvedValue({ query: "q", results: [searchResult("https://a.dev")] });
    stubStages({});

    await runResearchPipeline({ ...input, effort: "low" });
    expect(genMock.mock.calls.find((c) => c[0].stage === "plan")![0].system).toContain(
      "3-5 targeted web-search"
    );
  });

  it("propagates a plan-stage failure instead of synthesizing from nothing", async () => {
    genMock.mockRejectedValueOnce(new Error("gemini 503"));

    await expect(runResearchPipeline(input)).rejects.toThrow("gemini 503");
    expect(searchMock).not.toHaveBeenCalled();
  });

  it("skips a failed search and completes on the surviving queries", async () => {
    stubStages({});
    // Surviving queries return enough distinct evidence to stay non-sparse, so
    // the proxy wave does not fire and skew the direct-wave search counts.
    nonSparseSearches();
    searchMock.mockRejectedValueOnce(new Error("Tavily search failed (429)"));

    const events: PipelineProgressEvent[] = [];
    const { report: out, budget } = await runResearchPipeline(input, (e) => events.push(e));

    expect(out.companySnapshot).toBe("Payments");
    expect(searchMock).toHaveBeenCalledTimes(3);
    expect(events.some((e) => e.message.startsWith("Search failed, skipping:"))).toBe(true);
    // A failed call costs nothing, so only the two surviving searches are billed.
    const searchEntries = budget
      .breakdown()
      .filter((e) => e.kind === "search" && !e.detail.startsWith("extract"));
    expect(searchEntries).toHaveLength(2);
  });

  it("falls back to search snippets when full-page extraction fails", async () => {
    stubStages({});
    extractMock.mockRejectedValue(new Error("Tavily extract failed (500)"));

    const { report: out } = await runResearchPipeline(input);

    expect(out.companySnapshot).toBe("Payments");
    // Nothing was extracted, so the snippet reaches synthesis verbatim.
    const prompt = genMock.mock.calls.find((c) => c[0].stage === "synthesize")![0].prompt;
    expect(prompt).toContain("x".repeat(200));
  });
});

describe("gather stage", () => {
  it("searches every planned query and bills the right depth", async () => {
    stubStages({});
    // Distinct evidence per query keeps the run non-sparse, so no proxy wave
    // adds searches on top of the three planned ones.
    nonSparseSearches();

    const { budget } = await runResearchPipeline(input);

    expect(searchMock).toHaveBeenCalledTimes(3);
    for (const call of searchMock.mock.calls) {
      expect(call[1]?.excludeDomains).toContain("support.stripe.com");
      expect(call[1]?.excludeDomains).toContain("accounts.stripe.com");
    }
    const searchSpend = budget.breakdown().filter((e) => e.kind === "search");
    // Two advanced (2 credits) + one basic (1), plus a multi-page advanced extract (4).
    const credits = searchSpend.reduce((s, e) => s + e.costUsd, 0) / 0.008;
    expect(Math.round(credits)).toBe(9);
  });

  it("extracts the top result of every query within the medium ten-url cap", async () => {
    stubStages({
      plan: plan({
        queries: Array.from({ length: 8 }, (_, i) => ({
          query: `q${i}`,
          purpose: "p",
          depth: "basic" as const,
          category: "dsa",
        })),
      }),
    });
    searchMock.mockImplementation(async (q) => ({
      query: q,
      results: [searchResult(`https://${q}.dev`)],
    }));

    await runResearchPipeline(input);

    expect(extractMock).toHaveBeenCalledOnce();
    expect(extractMock.mock.calls[0][0]).toHaveLength(8);
  });

  it("overwrites a source's snippet with the extracted full text, truncated to 8k", async () => {
    stubStages({});
    extractMock.mockResolvedValue([{ url: "https://a.dev", rawContent: "F".repeat(20_000) }]);

    await runResearchPipeline(input);

    const compressPrompt = genMock.mock.calls.find((c) => c[0].stage === "compress")![0].prompt;
    // gatherStage truncates to 8000, then compressStage slices to 6000.
    expect(compressPrompt.match(/F+/)![0]).toHaveLength(6000);
  });

  it("ignores extracted content for a url that was never a search result", async () => {
    stubStages({});
    extractMock.mockResolvedValue([{ url: "https://ghost.dev", rawContent: "G".repeat(500) }]);

    await runResearchPipeline(input);

    const prompts = genMock.mock.calls.filter((c) => c[0].stage === "compress");
    expect(prompts.every((c) => !c[0].prompt.includes("GGG"))).toBe(true);
  });

  it("keeps a single copy of a url that ranks for several queries", async () => {
    stubStages({});
    const firsthand =
      "My interview at Stripe included an onsite where they asked me to design a cache. ".repeat(4);
    // Every query returns the same overlapping url plus one unique to it.
    searchMock.mockImplementation(async (q) => ({
      query: q,
      results: [
        searchResult("https://candidate-blog.dev/shared", firsthand),
        searchResult(`https://candidate-blog.dev/${q.replaceAll(" ", "-")}`, firsthand),
        searchResult(`https://candidate-blog.dev/${q.replaceAll(" ", "-")}-second`, firsthand),
      ],
    }));
    // Extracting the shared page keeps the run non-sparse (a full page behind
    // the evidence), so the proxy wave stays out of the source count.
    extractMock.mockResolvedValue([
      { url: "https://candidate-blog.dev/shared", rawContent: firsthand.repeat(3) },
    ]);

    await runResearchPipeline(input);

    // One evidence note, not one per query: the url shows up twice in the
    // synthesize prompt (the fixture title embeds it, plus the citation line).
    const prompt = genMock.mock.calls.find((c) => c[0].stage === "synthesize")![0].prompt;
    const evidenceBlock = prompt.split("Metadata-only resource catalog")[0];
    expect(evidenceBlock.split("https://candidate-blog.dev/shared").length - 1).toBe(2);
    expect(prompt).toContain("[7] "); // shared + 6 uniques
    expect(prompt).not.toContain("[8] ");
  });

  it("never queues the same url for extraction twice", async () => {
    stubStages({});
    const firsthand =
      "My interview at Stripe included an onsite where they asked me to design a cache. ".repeat(4);
    // The same page is the top hit for all three queries; each also brings a
    // unique second result so the run stays non-sparse and the proxy wave,
    // which would call extract again, never fires.
    searchMock.mockImplementation(async (q) => ({
      query: q,
      results: [
        searchResult("https://candidate-blog.dev/top", firsthand),
        searchResult(`https://candidate-blog.dev/${q.replaceAll(" ", "-")}`, firsthand),
        searchResult(`https://candidate-blog.dev/${q.replaceAll(" ", "-")}-second`, firsthand),
      ],
    }));
    extractMock.mockResolvedValue([
      { url: "https://candidate-blog.dev/top", rawContent: `${firsthand}${"E".repeat(500)}` },
    ]);

    await runResearchPipeline(input);

    expect(extractMock).toHaveBeenCalledOnce();
    const queued = extractMock.mock.calls[0][0];
    expect(queued).toContain("https://candidate-blog.dev/top");
    expect(new Set(queued).size).toBe(queued.length);

    // And the extracted text patches the (single) source that gets compressed.
    const compressed = genMock.mock.calls.filter((c) => c[0].stage === "compress");
    expect(compressed).toHaveLength(1);
    expect(compressed[0][0].prompt).toContain("EEE");
  });

  it("requests more results per search at high effort", async () => {
    stubStages({});

    await runResearchPipeline({ ...input, effort: "high" });

    for (const call of searchMock.mock.calls) {
      expect(call[1]!.maxResults).toBe(10);
    }
  });

  it("requests fewer results per search at low effort", async () => {
    stubStages({});

    await runResearchPipeline({ ...input, effort: "low" });

    for (const call of searchMock.mock.calls) {
      expect(call[1]!.maxResults).toBe(4);
    }
  });

  it("reads more full pages at high effort", async () => {
    stubStages({
      plan: plan({
        queries: Array.from({ length: 10 }, (_, i) => ({
          query: `q${i}`,
          purpose: "p",
          depth: "basic" as const,
          category: "dsa",
        })),
      }),
    });
    searchMock.mockImplementation(async (q) => ({
      query: q,
      results: [searchResult(`https://${q}.dev`)],
    }));

    await runResearchPipeline({ ...input, effort: "high" });

    expect(extractMock.mock.calls[0][0]).toHaveLength(10);
  });

  it("reads fewer full pages at low effort", async () => {
    stubStages({
      plan: plan({
        queries: Array.from({ length: 10 }, (_, i) => ({
          query: `q${i}`,
          purpose: "p",
          depth: "basic" as const,
          category: "dsa",
        })),
      }),
    });
    searchMock.mockImplementation(async (q) => ({
      query: q,
      results: [searchResult(`https://${q}.dev`)],
    }));

    await runResearchPipeline({ ...input, effort: "low" });

    expect(extractMock.mock.calls[0][0]).toHaveLength(3);
  });

  it("skips extraction entirely once the budget is exhausted", async () => {
    stubStages({ tokensByStage: { plan: [1_000_000, 0] } }); // $0.25 of a $0.25 cap

    await runResearchPipeline(input, undefined, 0.25);

    expect(searchMock).not.toHaveBeenCalled();
    expect(extractMock).not.toHaveBeenCalled();
  });

  it("preserves the synthesis reserve once plan spend reaches 85% of the budget", async () => {
    // Cap $1. Plan burns $0.86, leaving less than the protected synthesis budget.
    stubStages({ tokensByStage: { plan: [3_440_000, 0] } }); // 3.44M * $0.25/M = $0.86

    await runResearchPipeline(input, undefined, 1.0);

    expect(searchMock).not.toHaveBeenCalled();
  });

  it("does not dispatch a concurrent search chunk without enough reserved budget", async () => {
    stubStages({
      plan: plan({
        queries: Array.from({ length: 8 }, (_, i) => ({
          query: `q${i}`,
          purpose: "p",
          depth: "basic" as const,
          category: "dsa",
        })),
      }),
      tokensByStage: { plan: [3_960_000, 0] }, // $0.99 of a $1 cap
    });

    await runResearchPipeline(input, undefined, 1.0);

    expect(searchMock).not.toHaveBeenCalled();
  });
});

describe("compress stage", () => {
  it("drops sources with too little content to be worth keeping", async () => {
    stubStages({});
    searchMock.mockResolvedValue({
      query: "q",
      results: [searchResult("https://short.dev", "tiny"), searchResult("https://long.dev")],
    });

    const { report: out } = await runResearchPipeline(input);

    const prompt = genMock.mock.calls.find((c) => c[0].stage === "synthesize")![0].prompt;
    expect(prompt).not.toContain("short.dev");
    expect(prompt).toContain("long.dev");
    // Thin pages bypass synthesis but remain available to the user.
    expect(out.researchResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: "https://short.dev", access: "link_only" }),
      ])
    );
  });

  it("drops a source whose content is under the 40-character floor", async () => {
    stubStages({});
    searchMock.mockResolvedValue({
      query: "q",
      results: [searchResult("https://a.dev", "y".repeat(39))],
    });

    await runResearchPipeline(input);

    const prompt = genMock.mock.calls.find((c) => c[0].stage === "synthesize")![0].prompt;
    expect(prompt).toContain("no evidence gathered");
  });

  it("passes snippet-only sources through without a model call", async () => {
    stubStages({});
    searchMock.mockResolvedValue({
      query: "q",
      results: [
        searchResult("https://a.dev", "Snippet about Stripe's onsite loop and phone screen."),
      ],
    });

    await runResearchPipeline(input);

    // No extraction happened, so nothing warrants a compress call — the
    // snippet is already shorter than the summary the model would produce.
    expect(genMock.mock.calls.filter((c) => c[0].stage === "compress")).toHaveLength(0);
    const prompt = genMock.mock.calls.find((c) => c[0].stage === "synthesize")![0].prompt;
    expect(prompt).toContain("Snippet about Stripe's onsite loop and phone screen.");
  });

  it("compresses only the extracted pages, passing the rest through", async () => {
    stubStages({});
    searchMock.mockResolvedValue({
      query: "q",
      results: [searchResult("https://a.dev"), searchResult("https://b.dev")],
    });
    extractMock.mockResolvedValue([{ url: "https://a.dev", rawContent: "F".repeat(9000) }]);

    await runResearchPipeline(input);

    const compressed = genMock.mock.calls.filter((c) => c[0].stage === "compress");
    expect(compressed).toHaveLength(1);
    expect(compressed[0][0].prompt).toContain("https://a.dev");
  });

  it("falls back to the raw page opening when a compress call fails", async () => {
    genMock.mockImplementation(async (args) => {
      if (args.stage === "plan") return plan() as never;
      if (args.stage === "classify" || args.stage === "classify_extracted") {
        return classificationFor(args.prompt) as never;
      }
      if (args.stage === "compress") throw new Error("gemini 503");
      if (args.stage === "synthesize") return report() as never;
      if (args.stage === "synthesize_experiences") {
        return { interviewExperiences: report().interviewExperiences } as never;
      }
      if (args.stage === "synthesize_links") {
        return { importantLinks: report().importantLinks } as never;
      }
      if (args.stage === "synthesize_questions") {
        return { questions: report().questions } as never;
      }
      if (args.stage === "synthesize_topup" || args.stage === "synthesize_repair") {
        return {
          questions: generatedQuestionBatch(args.prompt, args.system),
        } as never;
      }
      if (args.stage === "synthesize_audit") return auditFor(args.prompt) as never;
      throw new Error(`unexpected stage ${args.stage}`);
    });
    extractMock.mockResolvedValue([{ url: "https://a.dev", rawContent: "E".repeat(3000) }]);

    const { report: out } = await runResearchPipeline(input);

    expect(out.companySnapshot).toBe("Payments");
    // The note survives as the first 1500 chars of the page instead of vanishing.
    const prompt = genMock.mock.calls.find((c) => c[0].stage === "synthesize")![0].prompt;
    expect(prompt).toContain("E".repeat(1500));
    expect(prompt).not.toContain("E".repeat(1501));
  });

  it("stops compressing once the budget runs out, keeping the notes gathered so far", async () => {
    // Ten queries at high effort yield eight extracted pages, compressed in
    // chunks of five. Each compress call burns $0.05 against a $0.3 cap, so the
    // first chunk lands over the cap and the second never dispatches.
    const queries = Array.from({ length: 10 }, (_, i) => ({
      query: `q${i}`,
      purpose: "p",
      depth: "basic" as const,
      category: "dsa",
    }));
    stubStages({ plan: plan({ queries }), tokensByStage: { compress: [200_000, 0] } });
    searchMock.mockImplementation(async (q) => ({
      query: q,
      results: [searchResult(`https://${q}.dev`)],
    }));
    extractMock.mockImplementation(async (urls) =>
      urls.map((url) => ({ url, rawContent: "P".repeat(500) }))
    );

    await runResearchPipeline({ ...input, effort: "high" }, undefined, 0.3);

    const compressed = genMock.mock.calls.filter((c) => c[0].stage === "compress");
    expect(compressed).toHaveLength(5); // first chunk only, of 8 extracted
  });
});

describe("synthesize stage", () => {
  it("keeps narrative and question structured outputs independently bounded", async () => {
    stubStages({});

    await runResearchPipeline(input);

    const narrative = genMock.mock.calls.find((call) => call[0].stage === "synthesize")![0];
    const narrativeShape = (narrative.schema as unknown as z.ZodObject<z.ZodRawShape>).shape;
    const experienceLinks = genMock.mock.calls.find(
      (call) => call[0].stage === "synthesize_experiences"
    )![0];
    const importantLinks = genMock.mock.calls.find(
      (call) => call[0].stage === "synthesize_links"
    )![0];
    const questionCalls = genMock.mock.calls.filter(
      (call) => call[0].stage === "synthesize_questions"
    );

    expect(Object.keys(narrativeShape)).not.toContain("questions");
    expect(Object.keys(narrativeShape)).not.toContain("interviewExperiences");
    expect(Object.keys(narrativeShape)).not.toContain("importantLinks");
    expect(narrative.maxOutputTokens).toBeLessThanOrEqual(6_300);
    expect(narrative.thinkingLevel).toBe("low");
    expect(experienceLinks.maxOutputTokens).toBeLessThanOrEqual(3_800);
    expect(importantLinks.maxOutputTokens).toBeLessThanOrEqual(3_800);
    expect(experienceLinks.thinkingLevel).toBe("low");
    expect(importantLinks.thinkingLevel).toBe("low");
    expect(questionCalls.length).toBeGreaterThan(0);
    expect(questionCalls.every((call) => call[0].maxOutputTokens <= 7_000)).toBe(true);
  });

  it("recovers a malformed core narrative by isolating smaller field groups", async () => {
    stubStages({});
    const fallback = genMock.getMockImplementation()!;
    genMock.mockImplementation(async (args) => {
      if (args.stage === "synthesize") {
        throw new ResearchStructuredOutputError(
          "synthesize",
          "core-truncated",
          2,
          new Error("length")
        );
      }
      return fallback(args);
    });

    const { report: out } = await runResearchPipeline(input);

    expect(out.companySnapshot).toBe("Payments");
    const recoveryCalls = genMock.mock.calls.filter((call) =>
      call[0].stage.startsWith("synthesize_core_")
    );
    expect(recoveryCalls).toHaveLength(2);
    expect(
      recoveryCalls.every(
        (call) =>
          Object.keys((call[0].schema as unknown as z.ZodObject<z.ZodRawShape>).shape).length <= 3
      )
    ).toBe(true);
  });

  it("uses evidence-safe fallbacks when even isolated core fields are malformed", async () => {
    stubStages({});
    const fallback = genMock.getMockImplementation()!;
    genMock.mockImplementation(async (args) => {
      if (args.stage === "synthesize" || args.stage.startsWith("synthesize_core_")) {
        throw new ResearchStructuredOutputError(
          args.stage,
          "core-field-truncated",
          2,
          new Error("length")
        );
      }
      return fallback(args);
    });

    const { report: out } = await runResearchPipeline(input);

    expect(out.companySnapshot).toEqual(expect.any(String));
    expect(out.companyExplainer).toContain("Stripe");
    expect(out.prepPlan.length).toBeGreaterThan(0);
    expect(
      genMock.mock.calls.some(
        (call) =>
          call[0].stage.startsWith("synthesize_core_") &&
          Object.keys((call[0].schema as unknown as z.ZodObject<z.ZodRawShape>).shape).length === 1
      )
    ).toBe(true);
  });

  it("uses ranked evidence links when optional link synthesis is malformed", async () => {
    stubStages({});
    const fallback = genMock.getMockImplementation()!;
    genMock.mockImplementation(async (args) => {
      if (args.stage === "synthesize_links") {
        throw new ResearchStructuredOutputError(
          "synthesize_links",
          "links-truncated",
          2,
          new Error("length")
        );
      }
      return fallback(args);
    });

    const { report: out } = await runResearchPipeline({
      ...input,
      sections: ["company", "loop", "skills"],
    });

    expect(out.interviewExperiences).toBeNull();
    expect(out.importantLinks).toEqual([
      expect.objectContaining({
        url: "https://a.dev",
        why: expect.stringContaining("semantically relevant"),
      }),
    ]);
  });

  it("feeds every compressed note into the evidence block with its citation index", async () => {
    stubStages({});

    await runResearchPipeline(input);

    const prompt = genMock.mock.calls.find((c) => c[0].stage === "synthesize")![0].prompt;
    expect(prompt).toContain("Evidence notes:");
    expect(prompt).toContain("[1] (loop_format, dsa, company)");
    expect(prompt).toContain("https://a.dev");
  });

  it("tells the model not to repeat questions an earlier pass already predicted", async () => {
    stubStages({});

    await runResearchPipeline({ ...input, excludeQuestions: ["LRU cache", "Two sum"] });

    const prompt = genMock.mock.calls.find((c) => c[0].stage === "synthesize_questions")![0].prompt;
    expect(prompt).toContain("Questions already used");
    expect(prompt).toContain("- LRU cache");
    expect(prompt).toContain("- Two sum");
  });

  it("omits the exclusion block entirely on a fresh run", async () => {
    stubStages({});

    await runResearchPipeline(input);

    const prompt = genMock.mock.calls.find((c) => c[0].stage === "synthesize_questions")![0].prompt;
    expect(prompt).toContain("Questions already used");
    expect(prompt).toContain("(none)");
  });

  it("asks for more questions and more links at high effort", async () => {
    stubStages({});

    await runResearchPipeline({ ...input, effort: "high" });

    const questionCalls = genMock.mock.calls.filter((c) => c[0].stage === "synthesize_questions");
    const links = genMock.mock.calls.find((c) => c[0].stage === "synthesize_links")![0];
    expect(questionCalls).toHaveLength(7);
    expect(questionCalls.every((call) => call[0].maxOutputTokens <= 7_000)).toBe(true);
    expect(links.system).toContain("Pick the 6-10 highest-value sources");
  });

  it("asks for fewer questions and fewer links at low effort", async () => {
    stubStages({});

    await runResearchPipeline({ ...input, effort: "low" });

    const questionCalls = genMock.mock.calls.filter((c) => c[0].stage === "synthesize_questions");
    const links = genMock.mock.calls.find((c) => c[0].stage === "synthesize_links")![0];
    expect(questionCalls).toHaveLength(2);
    expect(
      questionCalls.reduce(
        (sum, call) => sum + Number(call[0].system.match(/Return (\d+) distinct/)?.[1] ?? 0),
        0
      )
    ).toBe(8);
    expect(questionCalls.every((call) => call[0].thinkingLevel === "low")).toBe(true);
    expect(links.system).toContain("Pick the 2-4 highest-value sources");
  });

  it("splits a malformed question batch into smaller recovery batches", async () => {
    stubStages({});
    const fallback = genMock.getMockImplementation()!;
    let failed = false;
    genMock.mockImplementation(async (args) => {
      if (args.stage === "synthesize_questions" && !failed) {
        failed = true;
        throw new ResearchStructuredOutputError(
          "synthesize_questions",
          "test-diagnostic",
          2,
          new Error("truncated")
        );
      }
      return fallback(args);
    });

    const { report: out } = await runResearchPipeline({ ...input, effort: "low" });

    expect(out.questions).toHaveLength(8);
    const questionSystems = genMock.mock.calls
      .filter((call) => call[0].stage === "synthesize_questions")
      .map((call) => call[0].system);
    expect(questionSystems.some((system) => system.includes("Return 2 distinct"))).toBe(true);
  });

  it("enforces a balanced minimum across every requested round", async () => {
    stubStages({});

    const { report: out } = await runResearchPipeline({
      ...input,
      effort: "low",
      interviewTypes: ["dsa", "system_design"],
    });

    expect(out.questions.filter((question) => question.category === "dsa")).toHaveLength(4);
    expect(out.questions.filter((question) => question.category === "system_design")).toHaveLength(
      4
    );
  });

  it("rejects a report when bounded repairs cannot complete a requested round", async () => {
    stubStages({});
    const fallback = genMock.getMockImplementation()!;
    genMock.mockImplementation(async (args) => {
      if (
        args.stage === "synthesize_questions" ||
        args.stage === "synthesize_topup" ||
        args.stage === "synthesize_repair"
      ) {
        return { questions: report().questions } as never;
      }
      return fallback(args);
    });
    const events: PipelineProgressEvent[] = [];

    await expect(
      runResearchPipeline({ ...input, effort: "low" }, (event) => events.push(event))
    ).rejects.toThrow("dsa: 1/8");
    expect(events.some((event) => event.stage === "done")).toBe(false);
  });

  it("fills a short primary report to the effort minimum with distinct baselines", async () => {
    const prompts = [
      "Implement a trie that supports prefix search and deletion.",
      "Design a bounded queue with blocking producers and consumers.",
      "Find the shortest path through a weighted directed graph.",
      "Return the longest substring containing at most two distinct characters.",
      "Merge overlapping time intervals and preserve their source identifiers.",
      "Build an iterator that flattens a nested integer list lazily.",
      "Detect whether a linked list has a cycle and return its entry node.",
    ];
    stubStages({
      topupQuestions: prompts.map((question) => ({
        category: "dsa",
        question,
        confidence: "low",
        rationale: "Role-standard preparation, not a reported company question.",
        prepNote: "Explain complexity and edge cases.",
        evidenceUrls: [],
        basis: "baseline",
      })),
    });

    const { report: out } = await runResearchPipeline({ ...input, effort: "low" });

    expect(out.questions).toHaveLength(8);
    expect(out.questions.slice(1).every((question) => question.basis === "baseline")).toBe(true);
    expect(genMock.mock.calls.some((call) => call[0].stage === "synthesize_topup")).toBe(true);
  });

  it("keeps up to ten links at high effort, where medium would clip to six", async () => {
    const urls = Array.from({ length: 12 }, (_, i) => `https://s${i}.dev`);
    searchMock.mockResolvedValue({ query: "q", results: urls.map((u) => searchResult(u)) });
    stubStages({
      report: report({ importantLinks: urls.map((u) => ({ title: u, url: u, why: "w" })) }),
    });

    const { report: out } = await runResearchPipeline({ ...input, effort: "high" });

    expect(out.importantLinks).toHaveLength(10);
  });

  it("clips links to four at low effort", async () => {
    const urls = Array.from({ length: 12 }, (_, i) => `https://s${i}.dev`);
    searchMock.mockResolvedValue({ query: "q", results: urls.map((u) => searchResult(u)) });
    stubStages({
      report: report({ importantLinks: urls.map((u) => ({ title: u, url: u, why: "w" })) }),
    });

    const { report: out } = await runResearchPipeline({ ...input, effort: "low" });

    expect(out.importantLinks).toHaveLength(4);
  });

  it("tells the model to degrade gracefully when no evidence survived", async () => {
    stubStages({});
    searchMock.mockResolvedValue({ query: "q", results: [] });

    await runResearchPipeline(input);

    const prompt = genMock.mock.calls.find((c) => c[0].stage === "synthesize")![0].prompt;
    expect(prompt).toContain("no evidence gathered");
  });

  it("drops an importantLink whose url never appeared in the evidence", async () => {
    stubStages({
      report: report({
        importantLinks: [
          { title: "Real", url: "https://a.dev", why: "cited" },
          { title: "Hallucinated", url: "https://invented.dev", why: "made up" },
        ],
      }),
    });

    const { report: out } = await runResearchPipeline(input);

    expect(out.importantLinks.map((l) => l.url)).toEqual(["https://a.dev"]);
  });

  it("deduplicates repeated importantLinks", async () => {
    stubStages({
      report: report({
        importantLinks: [
          { title: "A", url: "https://a.dev", why: "1" },
          { title: "A again", url: "https://a.dev", why: "2" },
        ],
      }),
    });

    const { report: out } = await runResearchPipeline(input);

    expect(out.importantLinks).toHaveLength(1);
    expect(out.importantLinks[0].title).toBe("A");
  });

  it("caps importantLinks at six", async () => {
    const urls = Array.from({ length: 10 }, (_, i) => `https://s${i}.dev`);
    searchMock.mockResolvedValue({ query: "q", results: urls.map((u) => searchResult(u)) });
    stubStages({
      report: report({ importantLinks: urls.map((u) => ({ title: u, url: u, why: "w" })) }),
    });

    const { report: out } = await runResearchPipeline(input);

    expect(out.importantLinks).toHaveLength(6);
  });

  it("drops an interview experience whose url never appeared in the evidence", async () => {
    stubStages({
      report: report({
        interviewExperiences: [
          { title: "Real", url: "https://a.dev", why: "cited" },
          { title: "Hallucinated", url: "https://invented.dev", why: "made up" },
        ],
      }),
    });

    const { report: out } = await runResearchPipeline(input);

    expect(out.interviewExperiences?.map((l) => l.url)).toEqual(["https://a.dev"]);
  });

  it("caps interview experiences at the effort's link limit", async () => {
    const urls = Array.from({ length: 12 }, (_, i) => `https://s${i}.dev`);
    searchMock.mockResolvedValue({ query: "q", results: urls.map((u) => searchResult(u)) });
    stubStages({
      report: report({ interviewExperiences: urls.map((u) => ({ title: u, url: u, why: "w" })) }),
    });

    const { report: out } = await runResearchPipeline({ ...input, effort: "high" });

    expect(out.interviewExperiences).toHaveLength(10);
  });

  it("never lists the same url under both interview experiences and worth reading", async () => {
    searchMock.mockResolvedValue({
      query: "q",
      results: [searchResult("https://a.dev"), searchResult("https://b.dev")],
    });
    stubStages({
      report: report({
        interviewExperiences: [{ title: "Exp", url: "https://a.dev", why: "first-hand" }],
        importantLinks: [
          { title: "Same page again", url: "https://a.dev", why: "repeat" },
          { title: "Blog", url: "https://b.dev", why: "new" },
        ],
      }),
    });

    const { report: out } = await runResearchPipeline(input);

    expect(out.interviewExperiences?.map((l) => l.url)).toEqual(["https://a.dev"]);
    expect(out.importantLinks.map((l) => l.url)).toEqual(["https://b.dev"]);
  });

  it("leaves a link the experience cap dropped available to worth reading", async () => {
    const urls = Array.from({ length: 6 }, (_, i) => `https://s${i}.dev`);
    searchMock.mockResolvedValue({ query: "q", results: urls.map((u) => searchResult(u)) });
    // Low effort caps each section at four, so s4/s5 fall off the experiences
    // list — they were never "claimed", so worth reading may still use them.
    stubStages({
      report: report({
        interviewExperiences: urls.map((u) => ({ title: u, url: u, why: "w" })),
        importantLinks: [{ title: "s5", url: "https://s5.dev", why: "w" }],
      }),
    });

    const { report: out } = await runResearchPipeline({ ...input, effort: "low" });

    expect(out.interviewExperiences).toHaveLength(4);
    expect(out.importantLinks.map((l) => l.url)).toEqual(["https://s5.dev"]);
  });

  it("asks the planner for first-hand interview experience queries", async () => {
    stubStages({});

    await runResearchPipeline(input);

    const call = genMock.mock.calls.find((c) => c[0].stage === "plan")![0];
    expect(call.system).toContain("interview_experience");
    expect(call.system).toContain("community discussions, video accounts");
    expect(call.system).toContain("do not bake one platform list");
  });

  it("strips a hallucinated url from a question's citations but keeps the real one", async () => {
    searchMock.mockResolvedValue({
      query: "q",
      results: [
        searchResult(
          "https://a.dev",
          "My interview at Stripe included an onsite where they asked me to design an LRU cache."
        ),
      ],
    });
    stubStages({
      report: report({
        questions: [
          {
            category: "dsa",
            question: "LRU cache",
            confidence: "high",
            rationale: "reported",
            prepNote: "O(1)",
            evidenceUrls: ["https://a.dev", "https://invented.dev"],
            basis: "evidence",
          },
        ],
      }),
    });

    const { report: out } = await runResearchPipeline(input);

    expect(out.questions[0].evidenceUrls).toEqual(["https://a.dev"]);
    // One adjacent/unknown-role account remains useful, but is not enough for
    // high confidence about this exact target role.
    expect(out.questions[0].confidence).toBe("medium");
  });

  it("downgrades a question to low confidence when every citation was hallucinated", async () => {
    stubStages({
      report: report({
        questions: [
          {
            category: "dsa",
            question: "LRU cache",
            confidence: "high",
            rationale: "reported",
            prepNote: "O(1)",
            evidenceUrls: ["https://invented.dev", "https://also-fake.dev"],
            basis: "evidence",
          },
        ],
      }),
    });

    const { report: out } = await runResearchPipeline(input);

    expect(out.questions[0].evidenceUrls).toEqual([]);
    expect(out.questions[0].confidence).toBe("low");
  });

  it("returns no links at all when the model cited only hallucinated urls", async () => {
    stubStages({
      report: report({ importantLinks: [{ title: "X", url: "https://nope.dev", why: "w" }] }),
    });

    const { report: out } = await runResearchPipeline(input);

    expect(out.importantLinks).toEqual([]);
  });

  it("preserves an unreadable result as link-only without platform-specific rules", async () => {
    const url = "https://blocked.example/posts/example?utm_source=search#detail";
    searchMock.mockResolvedValue({
      query: "q",
      results: [searchResult(url, "tiny")],
    });
    stubStages({
      report: report({
        questions: [
          {
            category: "dsa",
            question: "Claimed question from an unreadable page",
            confidence: "high",
            rationale: "claimed",
            prepNote: "prep",
            evidenceUrls: [url],
            basis: "evidence",
          },
        ],
        researchResources: [
          {
            title: "Invented page summary",
            url,
            why: "This page says the interview always includes dynamic programming.",
            kind: "discussion",
            access: "full_text",
            usedAsEvidence: true,
          },
        ],
      }),
    });

    const { report: out } = await runResearchPipeline(input);

    expect(out.questions[0].evidenceUrls).toEqual([]);
    expect(out.questions[0].confidence).toBe("low");
    expect(out.researchResources).toEqual([
      expect.objectContaining({
        url: "https://blocked.example/posts/example",
        access: "link_only",
        usedAsEvidence: false,
        relevanceTier: "exact",
        why: expect.stringContaining("semantically relevant"),
      }),
    ]);
    expect(extractMock.mock.calls.flatMap((call) => call[0])).toContain(
      "https://blocked.example/posts/example"
    );
  });

  it("preserves a thin result when extraction fails instead of dropping its URL", async () => {
    searchMock.mockResolvedValue({
      query: "q",
      results: [searchResult("https://paywall.dev/story", "tiny")],
    });
    extractMock.mockRejectedValue(new Error("blocked"));
    stubStages({});

    const { report: out } = await runResearchPipeline(input);

    expect(out.researchResources).toEqual([
      expect.objectContaining({
        url: "https://paywall.dev/story",
        access: "link_only",
        usedAsEvidence: false,
      }),
    ]);
    const synthPrompt = genMock.mock.calls.find((call) => call[0].stage === "synthesize")![0]
      .prompt;
    expect(synthPrompt).not.toContain("paywall.dev");
  });

  it("labels extracted pages and substantive snippets independently", async () => {
    searchMock.mockResolvedValue({
      query: "q",
      results: [searchResult("https://full.dev/post"), searchResult("https://preview.dev/post")],
    });
    extractMock.mockResolvedValue([
      { url: "https://full.dev/post", rawContent: "Full page evidence. ".repeat(40) },
    ]);
    stubStages({});

    const { report: out } = await runResearchPipeline(input);
    const byUrl = Object.fromEntries(out.researchResources!.map((item) => [item.url, item]));

    expect(byUrl["https://full.dev/post"]).toMatchObject({
      access: "full_text",
      usedAsEvidence: false,
    });
    expect(byUrl["https://preview.dev/post"]).toMatchObject({
      access: "search_preview",
      usedAsEvidence: false,
    });
  });

  it("propagates valid Tavily favicons without exposing them to synthesis", async () => {
    searchMock.mockResolvedValue({
      query: "q",
      results: [
        searchResult(
          "https://a.dev",
          "Substantive evidence about the interview process. ".repeat(5),
          "https://icons.tavily.com/a.ico"
        ),
      ],
    });
    stubStages({
      report: report({
        researchResources: [
          {
            title: "Model resource",
            url: "https://a.dev",
            faviconUrl: "https://invented.dev/favicon.ico",
            why: "Useful source",
            kind: "other",
            access: "search_preview",
            usedAsEvidence: true,
          },
        ],
      }),
    });

    const { report: out } = await runResearchPipeline(input);
    const synthPrompt = genMock.mock.calls.find((call) => call[0].stage === "synthesize")![0]
      .prompt;

    expect(out.researchResources?.[0].faviconUrl).toBe("https://icons.tavily.com/a.ico");
    expect(synthPrompt).not.toContain("icons.tavily.com");
    expect(synthPrompt).not.toContain("invented.dev/favicon.ico");
  });

  it("preserves the first duplicate favicon and backfills a missing one", async () => {
    stubStages({});
    searchMock
      .mockResolvedValueOnce({
        query: "q1",
        results: [
          searchResult("https://kept.dev/post", undefined, "https://icons.dev/original.ico"),
          searchResult("https://backfilled.dev/post"),
        ],
      })
      .mockResolvedValueOnce({
        query: "q2",
        results: [
          searchResult("https://kept.dev/post#later", undefined, "https://icons.dev/new.ico"),
          searchResult(
            "https://backfilled.dev/post?utm_source=search",
            undefined,
            "https://icons.dev/backfill.ico"
          ),
        ],
      })
      .mockResolvedValue({
        query: "q3",
        results: [searchResult("https://third.dev/post"), searchResult("https://fourth.dev/post")],
      });
    extractMock.mockResolvedValue([
      { url: "https://kept.dev/post", rawContent: "Full page evidence. ".repeat(40) },
    ]);

    const { report: out } = await runResearchPipeline(input);
    const byUrl = Object.fromEntries(out.researchResources!.map((item) => [item.url, item]));

    expect(byUrl["https://kept.dev/post"].faviconUrl).toBe("https://icons.dev/original.ico");
    expect(byUrl["https://backfilled.dev/post"].faviconUrl).toBe("https://icons.dev/backfill.ico");
  });

  it("keeps every relevant discovered resource without inventing padding", async () => {
    const urls = Array.from({ length: 25 }, (_, i) => `https://resource-${i}.dev/post`);
    searchMock.mockResolvedValue({
      query: "q",
      results: urls.map((url, i) => ({
        ...searchResult(url),
        score: 1 - i / 100,
      })),
    });
    stubStages({});

    const low = await runResearchPipeline({ ...input, effort: "low" });
    expect(low.report.researchResources).toHaveLength(25);

    vi.clearAllMocks();
    searchMock.mockResolvedValue({
      query: "q",
      results: urls.map((url, i) => ({
        ...searchResult(url),
        score: 1 - i / 100,
      })),
    });
    extractMock.mockResolvedValue([]);
    stubStages({});
    const medium = await runResearchPipeline(input);
    expect(medium.report.researchResources).toHaveLength(25);

    vi.clearAllMocks();
    searchMock.mockResolvedValue({
      query: "q",
      results: [searchResult("https://only.dev/post")],
    });
    extractMock.mockResolvedValue([]);
    stubStages({});
    const scarce = await runResearchPipeline({ ...input, effort: "high" });
    expect(scarce.report.researchResources).toHaveLength(1);
  });

  it("rejects wrong-company and consumer-support hits before extraction and publication", async () => {
    const firsthand =
      "My interview at Stripe included an onsite where they asked me to design a cache. ".repeat(4);
    searchMock.mockImplementation(async (query) => ({
      query,
      results: [
        searchResult(`https://candidate-blog.dev/${query.replaceAll(" ", "-")}`, firsthand),
        searchResult(`https://candidate-blog.dev/${query.replaceAll(" ", "-")}-2`, firsthand),
        searchResult(`https://candidate-blog.dev/${query.replaceAll(" ", "-")}-3`, firsthand),
        {
          ...searchResult("https://deloitte.example/interview", firsthand),
          title: "Deloitte Interview Questions and Answers",
        },
        {
          ...searchResult("https://support.stripe.com/account", "Stripe account help center."),
          title: "Stripe account support",
        },
      ],
    }));
    extractMock.mockImplementation(async (urls) =>
      urls.map((url) => ({ url, rawContent: firsthand }))
    );
    stubStages({});

    const events: PipelineProgressEvent[] = [];
    const { report: out } = await runResearchPipeline(input, (event) => events.push(event));
    const urls = out.researchResources?.map((resource) => resource.url) ?? [];

    expect(urls).not.toContain("https://deloitte.example/interview");
    expect(urls).not.toContain("https://support.stripe.com/account");
    expect(extractMock.mock.calls.flatMap((call) => call[0])).not.toContain(
      "https://deloitte.example/interview"
    );
    expect(events.some((event) => event.message.includes("rejected 2 off-target"))).toBe(true);
  });
});

describe("sparse-evidence proxy wave", () => {
  it("broadens into a proxy wave when direct evidence is thin", async () => {
    // The default beforeEach returns one shared snippet — genuinely sparse.
    stubStages({});
    const events: PipelineProgressEvent[] = [];

    const { report: out } = await runResearchPipeline(input, (e) => events.push(e));

    const stages = genMock.mock.calls.map((c) => c[0].stage);
    expect(stages).toContain("plan_proxy");
    expect(events.some((e) => e.stage === "broaden")).toBe(true);
    expect(out.evidenceCoverage).toBe("sparse");
  });

  it("plans the proxy wave with the cheap model", async () => {
    stubStages({});

    await runResearchPipeline(input);

    const proxy = genMock.mock.calls.find((c) => c[0].stage === "plan_proxy")![0];
    expect(proxy.model).toBe("gemini-3.1-flash-lite");
  });

  it("does not broaden when direct evidence is plentiful", async () => {
    stubStages({});
    nonSparseSearches();
    const events: PipelineProgressEvent[] = [];

    const { report: out } = await runResearchPipeline(input, (e) => events.push(e));

    const stages = genMock.mock.calls.map((c) => c[0].stage);
    expect(stages).not.toContain("plan_proxy");
    expect(events.some((e) => e.stage === "broaden")).toBe(false);
    // Search density is sufficient, but the mocked report contains only one
    // grounded question, so the final report honestly remains sparse.
    expect(out.evidenceCoverage).toBe("sparse");
  });

  it("skips the proxy wave when the budget is already stretched, despite sparsity", async () => {
    // Plan burns 86% of the $1 cap, so shouldDegrade() is true after wave 1.
    stubStages({ tokensByStage: { plan: [3_440_000, 0] } });
    const events: PipelineProgressEvent[] = [];

    const { report: out } = await runResearchPipeline(input, (e) => events.push(e), 1.0);

    const stages = genMock.mock.calls.map((c) => c[0].stage);
    expect(stages).not.toContain("plan_proxy");
    expect(events.some((e) => e.stage === "broaden")).toBe(false);
    expect(out.evidenceCoverage).toBe("sparse");
  });

  it("completes on wave-1 evidence when the proxy plan call fails", async () => {
    genMock.mockImplementation(async (args) => {
      if (args.stage === "plan") return plan() as never;
      if (args.stage === "plan_proxy") throw new Error("gemini 503");
      if (args.stage === "classify" || args.stage === "classify_extracted") {
        return classificationFor(args.prompt) as never;
      }
      if (args.stage === "compress") return { summary: "s" } as never;
      if (args.stage === "synthesize") return report() as never;
      if (args.stage === "synthesize_experiences") {
        return { interviewExperiences: report().interviewExperiences } as never;
      }
      if (args.stage === "synthesize_links") {
        return { importantLinks: report().importantLinks } as never;
      }
      if (args.stage === "synthesize_questions") {
        return { questions: report().questions } as never;
      }
      if (args.stage === "synthesize_topup" || args.stage === "synthesize_repair") {
        return {
          questions: generatedQuestionBatch(args.prompt, args.system),
        } as never;
      }
      if (args.stage === "synthesize_audit") return auditFor(args.prompt) as never;
      throw new Error(`unexpected stage ${args.stage}`);
    });
    const events: PipelineProgressEvent[] = [];

    const { report: out } = await runResearchPipeline(input, (e) => events.push(e));

    expect(out.companySnapshot).toBe("Payments");
    // Direct evidence was still sparse, even though the proxy wave failed.
    expect(out.evidenceCoverage).toBe("sparse");
    expect(events.some((e) => e.message.startsWith("Broadened research failed"))).toBe(true);
  });

  it("dedupes a proxy-wave url against what wave 1 already gathered", async () => {
    // Both waves surface the same page; wave 2's copy is dropped, so synthesis
    // sees a single evidence note rather than a duplicate.
    searchMock.mockResolvedValue({ query: "q", results: [searchResult("https://shared.dev")] });
    stubStages({});

    await runResearchPipeline(input);

    const prompt = genMock.mock.calls.find((c) => c[0].stage === "synthesize")![0].prompt;
    expect(prompt).toContain("[1] ");
    expect(prompt).not.toContain("[2] ");
  });

  it("keeps an inferred question's proxy citation but caps its confidence", async () => {
    searchMock.mockImplementation(async (query) => ({
      query,
      results: [
        searchResult(
          query === "founder background" || query === "comparable startup interview"
            ? "https://proxy.dev"
            : "https://direct.dev"
        ),
      ],
    }));
    stubStages({
      report: report({
        questions: [
          {
            category: "dsa",
            question: "Systems design tradeoffs",
            confidence: "high",
            rationale: "the CTO ran a big-tech infra loop",
            prepNote: "p",
            evidenceUrls: ["https://proxy.dev"],
            basis: "inferred",
          },
        ],
      }),
    });

    const { report: out } = await runResearchPipeline(input);

    expect(out.questions[0].evidenceUrls).toEqual(["https://proxy.dev"]);
    expect(out.questions[0].basis).toBe("inferred");
    expect(out.questions[0].confidence).toBe("medium");
  });

  it("relaxes the synthesis prompt to allow inferred questions only when broadened", async () => {
    stubStages({});
    await runResearchPipeline(input);
    const sparsePrompt = genMock.mock.calls.find((c) => c[0].stage === "synthesize_questions")![0]
      .system;
    expect(sparsePrompt).toContain('Set "basis" to "inferred" only');

    vi.clearAllMocks();
    searchMock.mockResolvedValue({ query: "q", results: [searchResult("https://a.dev")] });
    extractMock.mockResolvedValue([]);
    stubStages({});
    nonSparseSearches();
    await runResearchPipeline(input);
    const richPrompt = genMock.mock.calls.find((c) => c[0].stage === "synthesize_questions")![0]
      .system;
    expect(richPrompt).toContain('"inferred" is reserved for notes marked proxy=true');
    expect(richPrompt).toContain('Set "basis" to "reconstructed"');
  });
});

describe("budget enforcement holes", () => {
  /**
   * The research route computes `capUsd` from the user's balance and comments
   * that "the run degrades and stops inside that budget, so the charge below
   * can never exceed the balance."
   *
   * That is not true. `synthesizeStage` is called unconditionally — there is no
   * `budget.shouldStop()` check between `compressStage` and it, and none inside
   * it. A run that has already exhausted its cap still makes the most expensive
   * call in the pipeline, on the priciest model.
   */
  it("synthesizes even when the budget is already exhausted", async () => {
    stubStages({ tokensByStage: { plan: [4_000_000, 0] } }); // $1.00 of a $0.5 cap

    const { budget } = await runResearchPipeline(input, undefined, 0.5);

    const synthesized = genMock.mock.calls.some((c) => c[0].stage === "synthesize");
    expect(synthesized).toBe(true);
    expect(budget.totalUsd).toBeGreaterThan(budget.capUsd);
  });

  it("lets total spend exceed the cap the caller paid for", async () => {
    stubStages({ tokensByStage: { plan: [1_000_000, 0], synthesize: [1_000_000, 100_000] } });

    const { budget } = await runResearchPipeline(input, undefined, 0.3);

    // plan $0.25 + searches + compress + synthesize ($2 + $1.20) ≫ $0.30.
    expect(budget.totalUsd).toBeGreaterThan(3);
    expect(budget.capUsd).toBe(0.3);
  });
});

describe("optional report sections", () => {
  /** What the synthesize call was actually asked to produce. */
  function synthesizeSchemaKeys(): string[] {
    const call = genMock.mock.calls.find((c) => c[0].stage === "synthesize")!;
    return Object.keys((call[0].schema as unknown as z.ZodObject<z.ZodRawShape>).shape);
  }

  function systemFor(stage: string): string {
    return genMock.mock.calls.find((c) => c[0].stage === stage)![0].system;
  }

  function searchedQueries(): string[] {
    return searchMock.mock.calls.map((c) => c[0]);
  }

  it("produces every default section, leaving the opt-in recruiter pitch out", async () => {
    stubStages({});

    const { report: out } = await runResearchPipeline(input);

    expect(out.companySnapshot).toBe("Payments");
    expect(out.likelyLoopStructure).toBe("Phone screen then onsite");
    expect(out.skillsRequired).toEqual([{ skill: "Idempotency", why: "Payments retry" }]);
    expect(out.interviewExperiences).toEqual([]);
    expect(synthesizeSchemaKeys()).toEqual(
      expect.arrayContaining([
        "companySnapshot",
        "companyExplainer",
        "likelyLoopStructure",
        "skillsRequired",
      ])
    );
    expect(synthesizeSchemaKeys()).not.toContain("interviewExperiences");
    expect(genMock.mock.calls.some((call) => call[0].stage === "synthesize_experiences")).toBe(
      true
    );
    expect(synthesizeSchemaKeys()).not.toContain("recruiterPitch");
    expect(out.recruiterPitch).toBeNull();
  });

  it("produces the recruiter pitch when it is opted in", async () => {
    stubStages({
      report: report({
        recruiterPitch: {
          candidateProfile: "Product-minded engineers",
          presentationTips: ["Lead with impact"],
        },
      }),
    });

    const { report: out } = await runResearchPipeline({
      ...input,
      sections: [...DEFAULT_SECTIONS, "recruiter"],
    });

    expect(synthesizeSchemaKeys()).toContain("recruiterPitch");
    expect(systemFor("synthesize")).toContain("In recruiterPitch");
    expect(out.recruiterPitch).toEqual({
      candidateProfile: "Product-minded engineers",
      presentationTips: ["Lead with impact"],
    });
  });

  it("keeps company searches for a recruiter-only request", async () => {
    stubStages({});

    // The pitch is inferred from what the company builds and values, so the
    // company evidence still earns its cost even with the prose switched off.
    await runResearchPipeline({ ...input, sections: ["recruiter"] });

    expect(searchedQueries()).toContain("stripe tech stack");
  });

  it("drops the loop_format search and section when the loop is not wanted", async () => {
    stubStages({});

    const { report: out } = await runResearchPipeline({
      ...input,
      sections: ["company", "skills", "experiences"],
    });

    // The planner is told not to plan one — and the plan stub returns one anyway,
    // which the pipeline must filter before it costs a search.
    expect(systemFor("plan")).toContain('Do not plan any query with category "loop_format"');
    expect(searchedQueries()).not.toContain("stripe interview process");

    expect(synthesizeSchemaKeys()).not.toContain("likelyLoopStructure");
    expect(out.likelyLoopStructure).toBeNull();
  });

  it("keeps company searches for the skills section even when the company prose is not wanted", async () => {
    stubStages({});

    const { report: out } = await runResearchPipeline({
      ...input,
      sections: ["loop", "skills", "experiences"],
    });

    // Skills are inferred from what the company builds, so the evidence still earns its cost.
    expect(searchedQueries()).toContain("stripe tech stack");
    expect(synthesizeSchemaKeys()).toContain("skillsRequired");
    expect(synthesizeSchemaKeys()).not.toContain("companySnapshot");
    expect(out.companySnapshot).toBeNull();
    expect(out.companyExplainer).toBeNull();
  });

  it("drops the company search once neither the company prose nor the skills need it", async () => {
    stubStages({});

    const { report: out } = await runResearchPipeline({
      ...input,
      sections: ["loop", "experiences"],
    });

    expect(systemFor("plan")).toContain('Do not plan any query with category "company"');
    expect(searchedQueries()).not.toContain("stripe tech stack");
    expect(out.skillsRequired).toBeNull();
  });

  it("still hunts first-hand accounts when the experiences section is off", async () => {
    // They are the primary evidence for predicting questions — only the section is dropped.
    stubStages({
      plan: plan({
        queries: [
          {
            query: "stripe interview experience blind",
            purpose: "accounts",
            depth: "advanced",
            category: "interview_experience",
          },
        ],
      }),
    });

    const { report: out } = await runResearchPipeline({
      ...input,
      sections: ["company", "loop", "skills"],
    });

    expect(searchedQueries()).toContain("stripe interview experience blind");
    expect(systemFor("plan")).toContain('category "interview_experience"');
    expect(synthesizeSchemaKeys()).not.toContain("interviewExperiences");
    expect(genMock.mock.calls.some((call) => call[0].stage === "synthesize_experiences")).toBe(
      false
    );
    // Null, not []: we never looked for the section, which is not the same as
    // having looked and found nothing.
    expect(out.interviewExperiences).toBeNull();
  });

  it("nulls every optional section when the caller wants none of them", async () => {
    stubStages({});

    const { report: out } = await runResearchPipeline({ ...input, sections: [] });

    expect(out.companySnapshot).toBeNull();
    expect(out.companyExplainer).toBeNull();
    expect(out.likelyLoopStructure).toBeNull();
    expect(out.skillsRequired).toBeNull();
    expect(out.interviewExperiences).toBeNull();
    expect(out.recruiterPitch).toBeNull();
    // What the caller still paid for, and still gets.
    expect(out.questions).toHaveLength(20);
    expect(out.prepPlan).toEqual(["Drill LRU"]);
  });
});
