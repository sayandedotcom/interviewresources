import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { PredictedQuestion, Report } from "@/lib/research/types";

import { ReportView } from "./report-view";

/**
 * The report is rendered from LLM output, so the component must survive shapes
 * the schema permits but the prompt discourages: unknown categories, missing
 * fields on older stored reports, malformed evidence urls.
 */

function question(overrides: Partial<PredictedQuestion> = {}): PredictedQuestion {
  return {
    category: "dsa",
    question: "Implement an LRU cache",
    confidence: "high",
    rationale: "Reported by three candidates",
    prepNote: "Cover O(1) get and put",
    evidenceUrls: ["https://www.blind.com/post/1"],
    ...overrides,
  };
}

function report(overrides: Partial<Report> = {}): Report {
  return {
    companySnapshot: "Stripe builds payments infrastructure.",
    companyExplainer: "When you buy shoes online and pay by card, Stripe moves the money.",
    likelyLoopStructure: "Recruiter screen, then a four-round onsite.",
    interviewerSummary: null,
    questions: [question()],
    prepPlan: ["Drill LRU cache", "Read the engineering blog"],
    importantLinks: [],
    ...overrides,
  };
}

const base = { costUsd: 0.35, creditsCharged: 46, canExport: false, company: "Stripe" };

describe("report body", () => {
  it("renders the company snapshot and the loop structure", () => {
    render(<ReportView {...base} report={report()} />);

    expect(screen.getByText("Stripe builds payments infrastructure.")).toBeInTheDocument();
    expect(screen.getByText("Recruiter screen, then a four-round onsite.")).toBeInTheDocument();
  });

  it("renders the plain-terms company explainer", () => {
    render(<ReportView {...base} report={report()} />);

    expect(screen.getByText("In plain terms")).toBeInTheDocument();
    expect(
      screen.getByText("When you buy shoes online and pay by card, Stripe moves the money.")
    ).toBeInTheDocument();
  });

  it("hides the explainer for legacy reports stored before the field existed", () => {
    const legacy = report();
    delete (legacy as Partial<Report>).companyExplainer;
    render(<ReportView {...base} report={legacy} />);

    expect(screen.queryByText("In plain terms")).not.toBeInTheDocument();
  });

  it("hides the loop section when the model found no loop evidence", () => {
    render(<ReportView {...base} report={report({ likelyLoopStructure: "" })} />);

    expect(screen.queryByText("The loop")).not.toBeInTheDocument();
  });

  it("hides the interviewer card when no interviewer was researched", () => {
    render(<ReportView {...base} report={report()} />);

    expect(screen.queryByText("The interviewer")).not.toBeInTheDocument();
  });

  it("shows the interviewer card when there is a summary", () => {
    render(
      <ReportView {...base} report={report({ interviewerSummary: "Ada writes about Rust." })} />
    );

    expect(screen.getByText("Ada writes about Rust.")).toBeInTheDocument();
  });

  it("renders the prep plan as a numbered, zero-padded list", () => {
    render(<ReportView {...base} report={report()} />);

    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
  });

  it("hides the prep plan section when it is empty", () => {
    render(<ReportView {...base} report={report({ prepPlan: [] })} />);

    expect(screen.queryByText("Prep plan")).not.toBeInTheDocument();
  });
});

describe("question grouping", () => {
  it("orders known categories by the taxonomy, not by the model's ordering", () => {
    const r = report({
      questions: [
        question({ category: "behavioral", question: "Tell me about a conflict" }),
        question({ category: "dsa", question: "LRU cache" }),
        question({ category: "system_design", question: "Design a rate limiter" }),
      ],
    });
    render(<ReportView {...base} report={r} />);

    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(["Algorithmic Coding", "System Design", "Behavioral"]);
  });

  it("places custom rounds after the known taxonomy, in first-seen order", () => {
    const r = report({
      questions: [
        question({ category: "live_debugging" }),
        question({ category: "bar_raiser" }),
        question({ category: "dsa" }),
      ],
    });
    render(<ReportView {...base} report={r} />);

    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(["Algorithmic Coding", "Live Debugging", "Bar Raiser"]);
  });

  it("renders a custom round exactly once even when it has several questions", () => {
    const r = report({
      questions: [
        question({ category: "live_debugging", question: "Q1" }),
        question({ category: "live_debugging", question: "Q2" }),
      ],
    });
    render(<ReportView {...base} report={r} />);

    expect(screen.getAllByRole("heading", { level: 3, name: "Live Debugging" })).toHaveLength(1);
    expect(screen.getByText("Q1")).toBeInTheDocument();
    expect(screen.getByText("Q2")).toBeInTheDocument();
  });

  it("groups every question under its own round", () => {
    const r = report({
      questions: [
        question({ category: "dsa", question: "LRU" }),
        question({ category: "dsa", question: "Two sum" }),
        question({ category: "hr_culture", question: "Why us?" }),
      ],
    });
    render(<ReportView {...base} report={r} />);

    const dsa = screen
      .getByRole("heading", { level: 3, name: "Algorithmic Coding" })
      .closest("div")!.parentElement!;
    expect(within(dsa).getByText("LRU")).toBeInTheDocument();
    expect(within(dsa).getByText("Two sum")).toBeInTheDocument();
  });

  it("renders a category whose identifier collides with an Object prototype key", () => {
    // A user can name a custom round "toString". The label helper must not read
    // off the prototype and render `undefined`.
    render(
      <ReportView {...base} report={report({ questions: [question({ category: "toString" })] })} />
    );

    expect(screen.getByRole("heading", { level: 3, name: "ToString" })).toBeInTheDocument();
    expect(screen.queryByText("undefined")).not.toBeInTheDocument();
  });
});

describe("confidence signal", () => {
  it("renders the glyph for each confidence level", () => {
    const r = report({
      questions: [
        question({ confidence: "high", question: "H" }),
        question({ confidence: "medium", question: "M" }),
        question({ confidence: "low", question: "L" }),
      ],
    });
    render(<ReportView {...base} report={r} />);

    expect(screen.getByTitle("Confidence: High")).toHaveTextContent("●●●");
    expect(screen.getByTitle("Confidence: Medium")).toHaveTextContent("●●○");
    expect(screen.getByTitle("Confidence: Low")).toHaveTextContent("●○○");
  });
});

describe("evidence links", () => {
  it("shows the bare hostname, stripped of www", () => {
    render(<ReportView {...base} report={report()} />);

    expect(screen.getByText("blind.com")).toBeInTheDocument();
  });

  it("opens evidence in a new tab without leaking the referrer", () => {
    render(<ReportView {...base} report={report()} />);

    const link = screen.getByRole("link", { name: /blind\.com/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("falls back to 'source' for a url it cannot parse", () => {
    render(
      <ReportView
        {...base}
        report={report({ questions: [question({ evidenceUrls: ["nonsense"] })] })}
      />
    );

    expect(screen.getByText("source")).toBeInTheDocument();
  });

  it("renders no evidence row when the model cited nothing", () => {
    render(
      <ReportView {...base} report={report({ questions: [question({ evidenceUrls: [] })] })} />
    );

    expect(screen.queryByText("blind.com")).not.toBeInTheDocument();
  });
});

describe("worth reading", () => {
  it("renders each important link with its title, host, and reason", () => {
    const r = report({
      importantLinks: [
        {
          title: "A full loop breakdown",
          url: "https://www.reddit.com/r/x",
          why: "Round by round",
        },
      ],
    });
    render(<ReportView {...base} report={r} />);

    expect(screen.getByRole("link", { name: "A full loop breakdown" })).toHaveAttribute(
      "href",
      "https://www.reddit.com/r/x"
    );
    expect(screen.getByText("reddit.com")).toBeInTheDocument();
    expect(screen.getByText("Round by round")).toBeInTheDocument();
  });

  it("hides the section when there are no links", () => {
    render(<ReportView {...base} report={report()} />);

    expect(screen.queryByText("Worth reading")).not.toBeInTheDocument();
  });

  it("survives an older stored report that predates importantLinks", () => {
    const { importantLinks: _gone, ...legacy } = report();

    expect(() => render(<ReportView {...base} report={legacy as Report} />)).not.toThrow();
    expect(screen.queryByText("Worth reading")).not.toBeInTheDocument();
  });
});

describe("cost and export", () => {
  it("shows the credits charged, with the metered dollar cost as a tooltip", () => {
    render(<ReportView {...base} report={report()} />);

    expect(screen.getByText("46 credits")).toHaveAttribute("title", "Metered cost $0.3500");
  });

  it("hides the cost line for a report whose charge was never recorded", () => {
    render(<ReportView {...base} creditsCharged={null} report={report()} />);

    expect(screen.queryByText(/credits$/)).not.toBeInTheDocument();
  });

  it("omits the tooltip when the dollar cost is unknown", () => {
    render(<ReportView {...base} costUsd={null} report={report()} />);

    expect(screen.getByText("46 credits")).not.toHaveAttribute("title");
  });

  it("shows a zero charge rather than hiding it", () => {
    render(<ReportView {...base} creditsCharged={0} report={report()} />);

    expect(screen.getByText("0 credits")).toBeInTheDocument();
  });

  it("hides the export button from a free user", () => {
    render(<ReportView {...base} report={report()} />);

    expect(screen.queryByRole("button", { name: /export/i })).not.toBeInTheDocument();
  });

  it("shows the export button to a Pro user", () => {
    render(<ReportView {...base} canExport report={report()} />);

    expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
  });

  it("downloads a slugged json file when a Pro user exports", async () => {
    const createObjectURL = vi.fn(() => "blob:report");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<ReportView {...base} canExport company="Acme Corp!" report={report()} />);
    await userEvent.click(screen.getByRole("button", { name: /export/i }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:report");

    const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(anchor.download).toBe("scouting-report-acme-corp.json");
  });

  it("falls back to a generic filename when the company name has no usable characters", async () => {
    vi.stubGlobal(
      "URL",
      Object.assign(URL, { createObjectURL: vi.fn(() => "blob:x"), revokeObjectURL: vi.fn() })
    );
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<ReportView {...base} canExport company="!!!" report={report()} />);
    await userEvent.click(screen.getByRole("button", { name: /export/i }));

    const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(anchor.download).toBe("scouting-report-report.json");
  });
});

describe("reset", () => {
  it("hides the reset button when no handler is given", () => {
    render(<ReportView {...base} report={report()} />);

    expect(screen.queryByRole("button", { name: /new report/i })).not.toBeInTheDocument();
  });

  it("calls back when the user starts a new report", async () => {
    const onReset = vi.fn();
    render(<ReportView {...base} report={report()} onReset={onReset} />);

    await userEvent.click(screen.getByRole("button", { name: /new report/i }));

    expect(onReset).toHaveBeenCalledOnce();
  });
});
