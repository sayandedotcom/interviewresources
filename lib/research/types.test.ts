import { describe, expect, it } from "vitest";

import {
  DEFAULT_SECTIONS,
  interviewerSchema,
  proxyPlanSchema,
  reportSchema,
  researchInputSchema,
  researchPlanSchema,
  storedReportSchema,
} from "./types";

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

  it("defaults effort to medium, preserving the pre-effort behaviour", () => {
    expect(researchInputSchema.parse(validInput).effort).toBe("medium");
  });

  it("accepts each effort level", () => {
    for (const effort of ["low", "medium", "high"] as const) {
      expect(researchInputSchema.parse({ ...validInput, effort }).effort).toBe(effort);
    }
  });

  it("rejects an effort level the presets have no entry for", () => {
    expect(() => researchInputSchema.parse({ ...validInput, effort: "extreme" })).toThrow();
  });

  it("defaults to the pre-recruiter sections, so a caller predating the field loses nothing", () => {
    expect(researchInputSchema.parse(validInput).sections).toEqual([...DEFAULT_SECTIONS]);
  });

  it("keeps the opt-in recruiter section out of the defaults but accepts it explicitly", () => {
    expect(DEFAULT_SECTIONS).not.toContain("recruiter");
    expect(researchInputSchema.parse({ ...validInput, sections: ["recruiter"] }).sections).toEqual([
      "recruiter",
    ]);
  });

  it("accepts a trimmed set of sections, including none at all", () => {
    expect(researchInputSchema.parse({ ...validInput, sections: ["skills"] }).sections).toEqual([
      "skills",
    ]);
    expect(researchInputSchema.parse({ ...validInput, sections: [] }).sections).toEqual([]);
  });

  it("rejects a section identifier the pipeline has no rules for", () => {
    expect(() => researchInputSchema.parse({ ...validInput, sections: ["salary"] })).toThrow();
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

  it("rejects a request with no rounds to gather", () => {
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

  it("keeps interviewers populated so the pipeline has someone to research", () => {
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

  it("accepts location, teamContext, and recruiterNotes", () => {
    const parsed = researchInputSchema.parse({
      ...validInput,
      location: "Bengaluru, India",
      teamContext: "AWS EC2",
      recruiterNotes: "Phone screen done, next is 2 coding rounds + 1 system design",
    });
    expect(parsed.location).toBe("Bengaluru, India");
    expect(parsed.teamContext).toBe("AWS EC2");
    expect(parsed.recruiterNotes).toBe(
      "Phone screen done, next is 2 coding rounds + 1 system design"
    );
  });

  it("defaults location, teamContext, and recruiterNotes to undefined", () => {
    const parsed = researchInputSchema.parse(validInput);
    expect(parsed.location).toBeUndefined();
    expect(parsed.teamContext).toBeUndefined();
    expect(parsed.recruiterNotes).toBeUndefined();
  });

  it("rejects an oversized location", () => {
    expect(() => researchInputSchema.parse({ ...validInput, location: "x".repeat(121) })).toThrow();
  });

  it("rejects an oversized teamContext", () => {
    expect(() =>
      researchInputSchema.parse({ ...validInput, teamContext: "x".repeat(201) })
    ).toThrow();
  });

  it("rejects oversized recruiterNotes", () => {
    expect(() =>
      researchInputSchema.parse({ ...validInput, recruiterNotes: "x".repeat(2001) })
    ).toThrow();
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

  it("caps the plan at twelve queries so one run cannot fan out unbounded", () => {
    const plan = {
      resolvedCompanyDomain: "stripe.com",
      companySummaryQuery: "what does stripe do",
      queries: Array.from({ length: 13 }, () => query),
    };
    expect(() => researchPlanSchema.parse(plan)).toThrow();
  });

  it("accepts the twelve queries a high-effort run may plan", () => {
    const plan = {
      resolvedCompanyDomain: "stripe.com",
      companySummaryQuery: "what does stripe do",
      queries: Array.from({ length: 12 }, () => query),
    };
    expect(() => researchPlanSchema.parse(plan)).not.toThrow();
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
    basis: "evidence" as const,
  };

  const validReport = {
    companySnapshot: "Payments infrastructure",
    companyExplainer: "Stripe moves money when you pay online.",
    likelyLoopStructure: "Phone screen, then onsite",
    interviewerSummary: null,
    questions: [question],
    skillsRequired: [{ skill: "Idempotency", why: "Every payment API retries" }],
    prepPlan: ["Drill LRU cache"],
    interviewExperiences: [{ title: "E", url: "https://example.com/e", why: "2024 E5 onsite" }],
    recruiterPitch: {
      candidateProfile: "Product-minded engineers with ownership",
      presentationTips: ["Lead with impact metrics"],
    },
    importantLinks: [{ title: "T", url: "https://example.com/a", why: "w" }],
  };

  it("accepts a well-formed report", () => {
    expect(() => reportSchema.parse(validReport)).not.toThrow();
  });

  it("does not let the model null out a section it was asked to write", () => {
    expect(() => reportSchema.parse({ ...validReport, companySnapshot: null })).toThrow();
  });

  it("stores an excluded section as null, and a report predating skillsRequired without it", () => {
    const excluded = {
      ...validReport,
      companySnapshot: null,
      companyExplainer: null,
      likelyLoopStructure: null,
      skillsRequired: null,
      interviewExperiences: null,
      recruiterPitch: null,
    };
    expect(() => storedReportSchema.parse(excluded)).not.toThrow();

    const legacy = { ...validReport, skillsRequired: undefined, recruiterPitch: undefined };
    expect(() => storedReportSchema.parse(legacy)).not.toThrow();
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

  it("permits an empty interviewExperiences array — no company has write-ups guaranteed", () => {
    expect(() => reportSchema.parse({ ...validReport, interviewExperiences: [] })).not.toThrow();
  });

  it("requires each question to declare its basis", () => {
    const { basis: _omitted, ...noBasis } = question;
    const bad = { ...validReport, questions: [noBasis] };
    expect(() => reportSchema.parse(bad)).toThrow();
  });

  it("rejects a basis value that is neither evidence nor inferred", () => {
    const bad = { ...validReport, questions: [{ ...question, basis: "guessed" }] };
    expect(() => reportSchema.parse(bad)).toThrow();
  });

  it("accepts an inferred question", () => {
    const inferred = { ...validReport, questions: [{ ...question, basis: "inferred" }] };
    expect(reportSchema.parse(inferred).questions[0].basis).toBe("inferred");
  });

  it("treats evidenceCoverage as optional so legacy reports still parse", () => {
    expect(reportSchema.parse(validReport).evidenceCoverage).toBeUndefined();
    expect(
      reportSchema.parse({ ...validReport, evidenceCoverage: "sparse" }).evidenceCoverage
    ).toBe("sparse");
  });
});

describe("proxyPlanSchema", () => {
  const validProxyPlan = {
    queries: [
      {
        query: "founder background",
        purpose: "founders",
        depth: "basic",
        category: "founder_background",
      },
      {
        query: "peer startup interviews",
        purpose: "peers",
        depth: "advanced",
        category: "comparable_company",
      },
    ],
  };

  it("accepts a well-formed proxy plan", () => {
    expect(() => proxyPlanSchema.parse(validProxyPlan)).not.toThrow();
  });

  it("requires at least two proxy queries", () => {
    expect(() => proxyPlanSchema.parse({ queries: [validProxyPlan.queries[0]] })).toThrow();
  });

  it("caps the proxy plan at eight queries", () => {
    const tooMany = { queries: Array.from({ length: 9 }, () => validProxyPlan.queries[0]) };
    expect(() => proxyPlanSchema.parse(tooMany)).toThrow();
  });
});
