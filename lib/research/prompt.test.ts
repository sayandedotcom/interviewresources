import { describe, expect, it } from "vitest";

import { buildAnswerPrompt } from "./prompt";
import type { PredictedQuestion, Report } from "./types";

function question(overrides: Partial<PredictedQuestion> = {}): PredictedQuestion {
  return {
    category: "dsa",
    question: "Implement an LRU cache",
    confidence: "high",
    rationale: "Reported by three candidates",
    prepNote: "Cover O(1) get and put",
    evidenceUrls: ["https://blind.com/post/1"],
    ...overrides,
  };
}

function report(overrides: Partial<Report> = {}): Report {
  return {
    companySnapshot: "Stripe builds payments infrastructure.",
    companyExplainer: "Stripe moves money when you pay online.",
    likelyLoopStructure: "Recruiter screen, then a four-round onsite.",
    interviewerSummary: null,
    questions: [question()],
    prepPlan: ["Drill LRU cache"],
    importantLinks: [{ title: "T", url: "https://blind.com/post/1", why: "w" }],
    ...overrides,
  };
}

describe("buildAnswerPrompt", () => {
  it("instructs the assistant to answer the questions", () => {
    const prompt = buildAnswerPrompt(report(), "Stripe");

    expect(prompt).toContain("preparing for a technical interview at Stripe");
    expect(prompt).toContain("Answer all 1 question above");
  });

  it("carries the company context the assistant needs", () => {
    const prompt = buildAnswerPrompt(report(), "Stripe");

    expect(prompt).toContain("Stripe builds payments infrastructure.");
    expect(prompt).toContain("Stripe moves money when you pay online.");
    expect(prompt).toContain("Recruiter screen, then a four-round onsite.");
  });

  it("numbers questions continuously across rounds and groups them by label", () => {
    const prompt = buildAnswerPrompt(
      report({
        questions: [
          question({ category: "dsa", question: "LRU cache" }),
          question({ category: "system_design", question: "Design a rate limiter" }),
          question({ category: "dsa", question: "Two sum" }),
        ],
      }),
      "Stripe"
    );

    // dsa questions collect under one heading, and numbering never restarts.
    expect(prompt).toContain("### Algorithmic Coding");
    expect(prompt).toContain("### System Design");
    expect(prompt).toContain("1. LRU cache");
    expect(prompt).toContain("2. Two sum");
    expect(prompt).toContain("3. Design a rate limiter");
    expect(prompt).toContain("Answer all 3 questions above");
  });

  it("includes the prep note so the assistant knows what a strong answer covers", () => {
    expect(buildAnswerPrompt(report(), "Stripe")).toContain(
      "A strong answer covers: Cover O(1) get and put"
    );
  });

  it("leaves evidence urls out — the assistant cannot read them", () => {
    expect(buildAnswerPrompt(report(), "Stripe")).not.toContain("https://blind.com/post/1");
  });

  it("labels a custom round the same way the report does", () => {
    const prompt = buildAnswerPrompt(
      report({ questions: [question({ category: "live_debugging" })] }),
      "Stripe"
    );

    expect(prompt).toContain("### Live Debugging");
  });

  it("omits the interviewer section when nobody was researched", () => {
    expect(buildAnswerPrompt(report(), "Stripe")).not.toContain("## The interviewer");
  });

  it("includes the interviewer section when there is a summary", () => {
    const prompt = buildAnswerPrompt(report({ interviewerSummary: "Ada writes Rust." }), "Stripe");

    expect(prompt).toContain("## The interviewer");
    expect(prompt).toContain("Ada writes Rust.");
  });

  it("survives a legacy report stored before companyExplainer existed", () => {
    const legacy = report();
    delete (legacy as Partial<Report>).companyExplainer;

    const prompt = buildAnswerPrompt(legacy, "Stripe");

    expect(prompt).not.toContain("In plain terms");
    expect(prompt).toContain("Stripe builds payments infrastructure.");
  });

  it("omits the loop section when the model found no loop evidence", () => {
    expect(buildAnswerPrompt(report({ likelyLoopStructure: "" }), "Stripe")).not.toContain(
      "## The interview loop"
    );
  });

  it("falls back to a generic noun when the company name is blank", () => {
    expect(buildAnswerPrompt(report(), "   ")).toContain(
      "preparing for a technical interview at the company"
    );
  });

  it("singularizes the closing instruction for a one-question report", () => {
    const prompt = buildAnswerPrompt(report(), "Stripe");
    expect(prompt).toContain("Answer all 1 question above");
    expect(prompt).not.toContain("Answer all 1 questions above");
  });
});
