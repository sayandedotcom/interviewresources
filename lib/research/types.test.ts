import { describe, expect, it } from "vitest";

import { interviewerSchema, reportSchema, researchInputSchema, researchPlanSchema } from "./types";

/**
 * researchInputSchema is the trust boundary: it parses the body of an
 * authenticated but otherwise untrusted POST. reportSchema is the other
 * boundary — it constrains what the LLM is allowed to hand back.
 */

const validInput = {
  companyName: "Stripe",
  interviewTypes: ["dsa"],
};

describe("researchInputSchema", () => {
  it("accepts the minimum viable request", () => {
    const parsed = researchInputSchema.parse(validInput);
    expect(parsed.companyName).toBe("Stripe");
  });

  it("defaults interviewers to empty and fullLoop to false", () => {
    const parsed = researchInputSchema.parse(validInput);
    expect(parsed.interviewers).toEqual([]);
    expect(parsed.fullLoop).toBe(false);
  });

  it("defaults excludeQuestions to empty, so a fresh run excludes nothing", () => {
    expect(researchInputSchema.parse(validInput).excludeQuestions).toEqual([]);
  });

  it("carries excludeQuestions through for an extension run", () => {
    const parsed = researchInputSchema.parse({ ...validInput, excludeQuestions: ["LRU cache"] });
    expect(parsed.excludeQuestions).toEqual(["LRU cache"]);
  });

  it("rejects a missing company name", () => {
    expect(() => researchInputSchema.parse({ interviewTypes: ["dsa"] })).toThrow();
  });

  it("rejects an empty company name", () => {
    expect(() => researchInputSchema.parse({ ...validInput, companyName: "" })).toThrow();
  });

  it("rejects a request with no rounds to scout", () => {
    expect(() => researchInputSchema.parse({ ...validInput, interviewTypes: [] })).toThrow();
  });

  it("rejects an empty-string round, which would produce a meaningless query", () => {
    expect(() => researchInputSchema.parse({ ...validInput, interviewTypes: [""] })).toThrow();
  });

  it("accepts custom round identifiers alongside the known taxonomy", () => {
    const parsed = researchInputSchema.parse({
      ...validInput,
      interviewTypes: ["dsa", "live_debugging", "bar_raiser"],
    });
    expect(parsed.interviewTypes).toHaveLength(3);
  });

  it("rejects a companyUrl that is not a URL", () => {
    expect(() => researchInputSchema.parse({ ...validInput, companyUrl: "stripe" })).toThrow();
  });

  it("accepts an omitted companyUrl", () => {
    expect(researchInputSchema.parse(validInput).companyUrl).toBeUndefined();
  });

  it("requires a name for every interviewer", () => {
    expect(() =>
      researchInputSchema.parse({ ...validInput, interviewers: [{ url: "https://x.com/a" }] })
    ).toThrow();
  });

  it("rejects an interviewer url that is not a URL", () => {
    expect(() =>
      researchInputSchema.parse({ ...validInput, interviewers: [{ name: "A", url: "not-a-url" }] })
    ).toThrow();
  });

  it("accepts an interviewer with no url", () => {
    const parsed = researchInputSchema.parse({ ...validInput, interviewers: [{ name: "Ada" }] });
    expect(parsed.interviewers[0]).toEqual({ name: "Ada" });
  });

  it("keeps interviewers populated so the route's Pro gate has something to reject", () => {
    const parsed = researchInputSchema.parse({
      ...validInput,
      interviewers: [{ name: "Ada" }, { name: "Grace" }],
    });
    expect(parsed.interviewers.length).toBeGreaterThan(0);
  });

  it("does not choke on an oversized job description — the pipeline truncates instead", () => {
    const parsed = researchInputSchema.parse({
      ...validInput,
      jobDescription: "x".repeat(100_000),
    });
    expect(parsed.jobDescription).toHaveLength(100_000);
  });
});

describe("interviewerSchema", () => {
  it("rejects an empty name", () => {
    expect(() => interviewerSchema.parse({ name: "" })).toThrow();
  });
});

describe("researchPlanSchema", () => {
  const query = { query: "q", purpose: "p", depth: "basic" as const, category: "dsa" };

  it("requires at least three queries", () => {
    const plan = {
      resolvedCompanyDomain: "stripe.com",
      companySummaryQuery: "what does stripe do",
      queries: [query, query],
    };
    expect(() => researchPlanSchema.parse(plan)).toThrow();
  });

  it("caps the plan at ten queries so one run cannot fan out unbounded", () => {
    const plan = {
      resolvedCompanyDomain: "stripe.com",
      companySummaryQuery: "what does stripe do",
      queries: Array.from({ length: 11 }, () => query),
    };
    expect(() => researchPlanSchema.parse(plan)).toThrow();
  });

  it("rejects a search depth Tavily does not price", () => {
    const plan = {
      resolvedCompanyDomain: "stripe.com",
      companySummaryQuery: "q",
      queries: [{ ...query, depth: "deep" }, query, query],
    };
    expect(() => researchPlanSchema.parse(plan)).toThrow();
  });
});

describe("reportSchema", () => {
  const question = {
    category: "dsa",
    question: "Implement an LRU cache",
    confidence: "high" as const,
    rationale: "Reported by three candidates",
    prepNote: "Discuss O(1) get/put",
    evidenceUrls: ["https://example.com/a"],
  };

  const validReport = {
    companySnapshot: "Payments infrastructure",
    companyExplainer: "Stripe moves money when you pay online.",
    likelyLoopStructure: "Phone screen, then onsite",
    interviewerSummary: null,
    questions: [question],
    prepPlan: ["Drill LRU cache"],
    importantLinks: [{ title: "T", url: "https://example.com/a", why: "w" }],
  };

  it("accepts a well-formed report", () => {
    expect(() => reportSchema.parse(validReport)).not.toThrow();
  });

  it("rejects a report with no questions — that is a failed run, not an empty one", () => {
    expect(() => reportSchema.parse({ ...validReport, questions: [] })).toThrow();
  });

  it("allows a null interviewerSummary when no interviewer was named", () => {
    expect(reportSchema.parse(validReport).interviewerSummary).toBeNull();
  });

  it("rejects an omitted interviewerSummary — the model must say null explicitly", () => {
    const { interviewerSummary: _omitted, ...rest } = validReport;
    expect(() => reportSchema.parse(rest)).toThrow();
  });

  it("rejects a confidence level the UI has no signal glyph for", () => {
    const bad = { ...validReport, questions: [{ ...question, confidence: "certain" }] };
    expect(() => reportSchema.parse(bad)).toThrow();
  });

  it("permits a question with no evidence urls, which the synthesis prompt forbids but the schema cannot", () => {
    // Documents a real gap: "every question must cite at least one evidence URL"
    // is prompt-only. If citation integrity matters, tighten this to .min(1).
    const uncited = { ...validReport, questions: [{ ...question, evidenceUrls: [] }] };
    expect(() => reportSchema.parse(uncited)).not.toThrow();
  });

  it("permits an empty importantLinks array", () => {
    expect(() => reportSchema.parse({ ...validReport, importantLinks: [] })).not.toThrow();
  });
});
