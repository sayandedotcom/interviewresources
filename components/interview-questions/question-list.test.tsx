import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { PublicQuestion } from "@/lib/publishing/public-report";

import { QuestionList } from "./question-list";

function question(over: Partial<PublicQuestion> = {}): PublicQuestion {
  return {
    category: "dsa",
    question: "Reverse a linked list.",
    confidence: "high",
    rationale: "Two candidate write-ups mention it.",
    evidenceUrls: ["https://www.leetcode.com/discuss/1"],
    basis: "evidence",
    ...over,
  };
}

/** Five questions across two categories — the threshold at which the filter appears. */
function filterableQuestions(): PublicQuestion[] {
  return [
    question({ question: "Q1", category: "dsa" }),
    question({ question: "Q2", category: "dsa" }),
    question({ question: "Q3", category: "dsa" }),
    question({ question: "Q4", category: "system_design" }),
    question({ question: "Q5", category: "system_design" }),
  ];
}

describe("QuestionList", () => {
  it("labels evidence links by host rather than by ordinal", () => {
    render(<QuestionList questions={[question()]} />);
    expect(screen.getByRole("link", { name: /leetcode\.com/ })).toHaveAttribute(
      "href",
      "https://www.leetcode.com/discuss/1"
    );
  });

  it("hides the filter when there is only one category", () => {
    render(
      <QuestionList questions={filterableQuestions().map((q) => ({ ...q, category: "dsa" }))} />
    );
    expect(screen.queryByRole("group", { name: /filter questions/i })).not.toBeInTheDocument();
  });

  it("hides the filter when there are too few questions to lose track of", () => {
    render(<QuestionList questions={filterableQuestions().slice(0, 4)} />);
    expect(screen.queryByRole("group", { name: /filter questions/i })).not.toBeInTheDocument();
  });

  it("offers a chip per category once the list is worth filtering", () => {
    render(<QuestionList questions={filterableQuestions()} />);
    expect(screen.getByRole("button", { name: "All 5" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Algorithmic Coding" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "System Design" })).toBeInTheDocument();
  });

  /**
   * The commercial point of these pages is that a crawler sees every question.
   * Filtering must therefore hide, never unmount — this asserts the DOM node
   * survives a filter that excludes it.
   */
  it("keeps filtered-out questions in the DOM", async () => {
    render(<QuestionList questions={filterableQuestions()} />);

    await userEvent.click(screen.getByRole("button", { name: "System Design" }));

    const filteredOut = screen.getByRole("heading", { name: "Q1" });
    expect(filteredOut).toBeInTheDocument();
    expect(filteredOut.closest("li")).toHaveClass("hidden");
    expect(screen.getByRole("heading", { name: "Q4" }).closest("li")).not.toHaveClass("hidden");
  });

  it("restores every question when the all chip is reselected", async () => {
    render(<QuestionList questions={filterableQuestions()} />);

    await userEvent.click(screen.getByRole("button", { name: "System Design" }));
    await userEvent.click(screen.getByRole("button", { name: "All 5" }));

    expect(screen.getByRole("heading", { name: "Q1" }).closest("li")).not.toHaveClass("hidden");
  });
});
