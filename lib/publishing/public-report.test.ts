import { describe, expect, it } from "vitest";

import type { Report } from "@/lib/research/types";

import {
  MIN_EVIDENCE_QUESTIONS,
  PUBLIC_QUESTION_LIMIT,
  publishability,
  toPublicReport,
} from "./public-report";
import { findDuplicatePairs, publishedPageBodyText } from "./similarity";

function question(over: Partial<Report["questions"][number]> = {}): Report["questions"][number] {
  return {
    category: "system_design",
    question: "How would you design an idempotent payment endpoint?",
    confidence: "high",
    rationale: "Two candidate write-ups mention idempotency keys in the payments round.",
    prepNote: "Cover retry semantics, idempotency keys, and exactly-once delivery.",
    evidenceUrls: ["https://example.com/a"],
    basis: "evidence",
    ...over,
  };
}

function report(over: Partial<Report> = {}): Report {
  return {
    companySnapshot: "A payments company.",
    companyExplainer: "x".repeat(250),
    likelyLoopStructure: "Screen, then a four-round onsite.",
    interviewerSummary: null,
    questions: [question()],
    skillsRequired: [],
    prepPlan: ["Revise idempotency"],
    interviewExperiences: [],
    recruiterPitch: null,
    importantLinks: [
      { title: "A", url: "https://example.com/a", why: "why" },
      { title: "B", url: "https://example.com/b", why: "why" },
      { title: "C", url: "https://example.com/c", why: "why" },
    ],
    evidenceCoverage: "rich",
    ...over,
  } as Report;
}

describe("toPublicReport", () => {
  it("never leaks the fields that are the paid product", () => {
    const pub = toPublicReport(report());
    const serialised = JSON.stringify(pub);

    // prepNote is the single most important omission: it is what a strong
    // answer covers, i.e. the thing people pay for.
    expect(serialised).not.toContain("idempotency keys, and exactly-once");
    expect(pub.questions[0]).not.toHaveProperty("prepNote");
    expect(pub).not.toHaveProperty("prepPlan");
    expect(pub).not.toHaveProperty("skillsRequired");
    expect(pub).not.toHaveProperty("recruiterPitch");
  });

  it("publishes the evidence, which is the whole point", () => {
    const pub = toPublicReport(report());
    expect(pub.questions[0].evidenceUrls).toEqual(["https://example.com/a"]);
    expect(pub.questions[0].rationale).toBeTruthy();
  });

  it("caps the number of questions and reports the true total", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      question({ question: `Q${i}`, evidenceUrls: [] })
    );
    const pub = toPublicReport(report({ questions: many }));

    expect(pub.questions).toHaveLength(PUBLIC_QUESTION_LIMIT);
    expect(pub.totalQuestions).toBe(20);
  });

  it("shows evidence-backed questions ahead of inferred ones", () => {
    const pub = toPublicReport(
      report({
        questions: [
          question({ question: "inferred-low", basis: "inferred", confidence: "low" }),
          question({ question: "evidence-high", basis: "evidence", confidence: "high" }),
        ],
      })
    );

    expect(pub.questions[0].question).toBe("evidence-high");
  });
});

describe("publishability", () => {
  it("passes a rich report with enough evidence", () => {
    const questions = Array.from({ length: MIN_EVIDENCE_QUESTIONS }, (_, i) =>
      question({ question: `Q${i}` })
    );
    expect(publishability(report({ questions })).ok).toBe(true);
  });

  it("blocks a sparse run", () => {
    const questions = Array.from({ length: MIN_EVIDENCE_QUESTIONS }, (_, i) =>
      question({ question: `Q${i}` })
    );
    const result = publishability(report({ questions, evidenceCoverage: "sparse" }));

    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toContain("proxy research");
  });

  it("blocks a report that is mostly inference", () => {
    const result = publishability(
      report({ questions: [question({ basis: "inferred" }), question({ basis: "baseline" })] })
    );

    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toContain("evidence-backed");
  });
});

describe("duplicate-content gate", () => {
  it("flags two pages built from the same template", () => {
    const template = (company: string) =>
      publishedPageBodyText({
        companyExplainer: `${company} is a technology company that builds software for its customers and operates at scale across many regions worldwide.`,
        companySnapshot: `${company} uses a modern stack.`,
        likelyLoopStructure: `A recruiter screen, a technical screen, and an onsite loop of four rounds covering coding and design.`,
        questions: [
          {
            question: "Tell me about a hard technical problem you solved.",
            rationale: "Standard behavioural question asked at most companies of this size.",
          },
        ],
      });

    const findings = findDuplicatePairs([
      { id: "stripe", text: template("Stripe") },
      { id: "monzo", text: template("Monzo") },
    ]);

    expect(findings).toHaveLength(1);
    expect(findings[0].ratio).toBeGreaterThan(0.6);
  });

  it("passes pages carrying genuinely distinct research", () => {
    const findings = findDuplicatePairs([
      {
        id: "stripe",
        text: publishedPageBodyText({
          companyExplainer:
            "Stripe builds payments infrastructure: APIs that let a business charge a card without ever touching card data themselves.",
          companySnapshot: "Ruby and Go, very high transaction volume, strong API design culture.",
          likelyLoopStructure:
            "An initial screen, then a bug-squash round, an integration round, and a systems design round unusual in its focus on idempotency.",
          questions: [
            {
              question: "How would you make a payment endpoint safe to retry?",
              rationale:
                "Two published candidate accounts describe an idempotency-focused integration round.",
            },
          ],
        }),
      },
      {
        id: "figma",
        text: publishedPageBodyText({
          companyExplainer:
            "Figma makes a browser-based design tool where several people edit the same file simultaneously, which is a hard rendering and synchronisation problem.",
          companySnapshot: "C++ compiled to WebAssembly, custom multiplayer sync engine.",
          likelyLoopStructure:
            "A recruiter call, then a take-home style rendering exercise and a round about conflict resolution in collaborative editing.",
          questions: [
            {
              question: "How do you resolve concurrent edits to the same object?",
              rationale:
                "The engineering blog describes their multiplayer conflict resolution in detail.",
            },
          ],
        }),
      },
    ]);

    expect(findings).toEqual([]);
  });
});
