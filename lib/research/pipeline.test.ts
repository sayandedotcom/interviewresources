import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BudgetTracker, GeminiModel } from "./budget";
import type { PipelineProgressEvent, Report, ResearchInput, ResearchPlan } from "./types";

vi.mock("./gemini");
vi.mock("./tavily", async (importOriginal) => {
  // Keep the real credit-costing functions; only the network calls are faked.
  const actual = await importOriginal<typeof import("./tavily")>();
  return { ...actual, tavilySearch: vi.fn(), tavilyExtract: vi.fn() };
});

const { generateStructured } = await import("./gemini");
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
};

function plan(overrides: Partial<ResearchPlan> = {}): ResearchPlan {
  return {
    resolvedCompanyDomain: "stripe.com",
    companySummaryQuery: "what does stripe do",
    queries: [
      {
        query: "stripe interview process",
        purpose: "loop",
        depth: "advanced",
        category: "loop_format",
      },
      { query: "stripe dsa questions", purpose: "dsa", depth: "basic", category: "dsa" },
      { query: "stripe tech stack", purpose: "company", depth: "advanced", category: "company" },
    ],
    ...overrides,
  };
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
      },
    ],
    prepPlan: ["Drill LRU"],
    importantLinks: [],
    ...overrides,
  };
}

function searchResult(url: string, content = "x".repeat(200)) {
  return { title: `Title ${url}`, url, content, score: 0.9 };
}

/**
 * Drives generateStructured stage-by-stage, recording a caller-chosen token cost
 * into the real BudgetTracker so budget-threshold behaviour is exercised for
 * real rather than stubbed.
 */
function stubStages(opts: {
  plan?: ResearchPlan;
  report?: Report;
  tokensByStage?: Partial<Record<string, [number, number]>>;
  model?: GeminiModel;
}) {
  genMock.mockImplementation(async (args) => {
    const budget = args.budget as BudgetTracker;
    const [inTok, outTok] = opts.tokensByStage?.[args.stage] ?? [0, 0];
    budget.recordLlmCall(args.stage, args.model, inTok, outTok);

    if (args.stage === "plan") return (opts.plan ?? plan()) as never;
    if (args.stage === "compress") return { summary: `summary of ${args.stage}` } as never;
    if (args.stage === "synthesize") return (opts.report ?? report()) as never;
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
    expect(stages.at(-1)).toBe("synthesize");
  });

  it("uses the cheap model to plan and compress, and the strong model to synthesize", async () => {
    stubStages({});

    await runResearchPipeline(input);

    const byStage = Object.fromEntries(genMock.mock.calls.map((c) => [c[0].stage, c[0].model]));
    expect(byStage.plan).toBe("gemini-3.1-flash-lite-preview");
    expect(byStage.compress).toBe("gemini-3.1-flash-lite-preview");
    expect(byStage.synthesize).toBe("gemini-3.1-pro-preview");
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

  it("truncates a huge job description before it reaches the model", async () => {
    stubStages({});

    await runResearchPipeline({ ...input, jobDescription: "J".repeat(50_000) });

    const planPrompt = genMock.mock.calls.find((c) => c[0].stage === "plan")![0].prompt;
    expect(planPrompt.split("Job description: ")[1]).toHaveLength(2000);
  });

  it("propagates a plan-stage failure instead of synthesizing from nothing", async () => {
    genMock.mockRejectedValueOnce(new Error("gemini 503"));

    await expect(runResearchPipeline(input)).rejects.toThrow("gemini 503");
    expect(searchMock).not.toHaveBeenCalled();
  });

  it("propagates a Tavily failure", async () => {
    stubStages({});
    searchMock.mockRejectedValueOnce(new Error("Tavily search failed (429)"));

    await expect(runResearchPipeline(input)).rejects.toThrow(/429/);
  });
});

describe("gather stage", () => {
  it("searches every planned query and bills the right depth", async () => {
    stubStages({});

    const { budget } = await runResearchPipeline(input);

    expect(searchMock).toHaveBeenCalledTimes(3);
    const searchSpend = budget.breakdown().filter((e) => e.kind === "search");
    // two advanced (2 credits) + one basic (1) = 5 credits, plus one extract (1).
    const credits = searchSpend.reduce((s, e) => s + e.costUsd, 0) / 0.008;
    expect(Math.round(credits)).toBe(6);
  });

  it("extracts full pages for the top result of each query, capped at five urls", async () => {
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
    expect(extractMock.mock.calls[0][0]).toHaveLength(5);
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
    // Every query returns the same overlapping url plus one unique to it.
    searchMock.mockImplementation(async (q) => ({
      query: q,
      results: [
        searchResult("https://shared.dev"),
        searchResult(`https://${q.replaceAll(" ", "-")}.dev`),
      ],
    }));

    await runResearchPipeline(input);

    const compressed = genMock.mock.calls.filter((c) => c[0].stage === "compress");
    const sharedMentions = compressed.filter((c) => c[0].prompt.includes("https://shared.dev"));
    expect(sharedMentions).toHaveLength(1); // one compress call, not one per query
    expect(compressed).toHaveLength(4); // shared + 3 uniques
  });

  it("never queues the same url for extraction twice", async () => {
    stubStages({});
    // The same page is the top hit for all three queries.
    searchMock.mockResolvedValue({ query: "q", results: [searchResult("https://top.dev")] });
    extractMock.mockResolvedValue([{ url: "https://top.dev", rawContent: "E".repeat(500) }]);

    await runResearchPipeline(input);

    expect(extractMock).toHaveBeenCalledOnce();
    expect(extractMock.mock.calls[0][0]).toEqual(["https://top.dev"]);

    // And the extracted text patches the (single) source that gets compressed.
    const compressed = genMock.mock.calls.filter((c) => c[0].stage === "compress");
    expect(compressed).toHaveLength(1);
    expect(compressed[0][0].prompt).toContain("EEE");
  });

  it("skips extraction entirely once the budget is exhausted", async () => {
    stubStages({ tokensByStage: { plan: [1_000_000, 0] } }); // $0.25 of a $0.25 cap

    await runResearchPipeline(input, undefined, 0.25);

    expect(searchMock).not.toHaveBeenCalled();
    expect(extractMock).not.toHaveBeenCalled();
  });

  it("degrades advanced searches to basic once 85% of the budget is spent", async () => {
    // Cap $1. Plan burns $0.86 → shouldDegrade() is true before the first search.
    stubStages({ tokensByStage: { plan: [3_440_000, 0] } }); // 3.44M * $0.25/M = $0.86

    await runResearchPipeline(input, undefined, 1.0);

    expect(searchMock).toHaveBeenCalledTimes(3);
    for (const call of searchMock.mock.calls) {
      expect(call[1]!.depth).toBe("basic");
    }
  });

  it("stops mid-plan when a search pushes the run over its cap", async () => {
    stubStages({ tokensByStage: { plan: [3_960_000, 0] } }); // $0.99 of a $1 cap

    await runResearchPipeline(input, undefined, 1.0);

    // First search is allowed (shouldStop() was false), costs $0.008 → $0.998.
    // Still under $1, so the second runs → $1.006. The third is blocked.
    expect(searchMock).toHaveBeenCalledTimes(2);
  });
});

describe("compress stage", () => {
  it("skips sources with too little content to be worth a model call", async () => {
    stubStages({});
    searchMock.mockResolvedValue({
      query: "q",
      results: [searchResult("https://short.dev", "tiny"), searchResult("https://long.dev")],
    });

    await runResearchPipeline(input);

    const compressed = genMock.mock.calls.filter((c) => c[0].stage === "compress");
    expect(compressed.every((c) => !c[0].prompt.includes("short.dev"))).toBe(true);
    expect(compressed.some((c) => c[0].prompt.includes("long.dev"))).toBe(true);
  });

  it("skips a source whose content is exactly at the 40-character floor", async () => {
    stubStages({});
    searchMock.mockResolvedValue({
      query: "q",
      results: [searchResult("https://a.dev", "y".repeat(39))],
    });

    await runResearchPipeline(input);

    expect(genMock.mock.calls.filter((c) => c[0].stage === "compress")).toHaveLength(0);
  });

  it("stops compressing once the budget runs out, keeping the notes gathered so far", async () => {
    searchMock.mockResolvedValue({
      query: "q",
      results: [
        searchResult("https://a.dev"),
        searchResult("https://b.dev"),
        searchResult("https://c.dev"),
      ],
    });
    // Each compress call burns $0.05; a $0.2 cap allows ~4 before stopping.
    stubStages({ tokensByStage: { compress: [200_000, 0] } });

    await runResearchPipeline(input, undefined, 0.2);

    const compressed = genMock.mock.calls.filter((c) => c[0].stage === "compress");
    expect(compressed.length).toBeGreaterThan(0);
    expect(compressed.length).toBeLessThan(9); // 3 queries x 3 results
  });
});

describe("synthesize stage", () => {
  it("feeds every compressed note into the evidence block with its citation index", async () => {
    stubStages({});

    await runResearchPipeline(input);

    const prompt = genMock.mock.calls.find((c) => c[0].stage === "synthesize")![0].prompt;
    expect(prompt).toContain("Evidence notes:");
    expect(prompt).toContain("[1] (loop_format)");
    expect(prompt).toContain("https://a.dev");
  });

  it("tells the model not to repeat questions an earlier pass already predicted", async () => {
    stubStages({});

    await runResearchPipeline({ ...input, excludeQuestions: ["LRU cache", "Two sum"] });

    const prompt = genMock.mock.calls.find((c) => c[0].stage === "synthesize")![0].prompt;
    expect(prompt).toContain("Already predicted");
    expect(prompt).toContain("- LRU cache");
    expect(prompt).toContain("- Two sum");
  });

  it("omits the exclusion block entirely on a fresh run", async () => {
    stubStages({});

    await runResearchPipeline(input);

    const prompt = genMock.mock.calls.find((c) => c[0].stage === "synthesize")![0].prompt;
    expect(prompt).not.toContain("Already predicted");
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

  it("strips a hallucinated url from a question's citations but keeps the real one", async () => {
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
          },
        ],
      }),
    });

    const { report: out } = await runResearchPipeline(input);

    expect(out.questions[0].evidenceUrls).toEqual(["https://a.dev"]);
    expect(out.questions[0].confidence).toBe("high"); // still grounded
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
