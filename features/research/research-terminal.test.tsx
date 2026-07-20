import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResearchTerminal, type TerminalLine } from "./research-terminal";

function line(overrides: Partial<TerminalLine> = {}): TerminalLine {
  return {
    id: 0,
    stage: "plan",
    message: "Building research plan...",
    at: "2026-07-16T00:00:00.000Z",
    ...overrides,
  };
}

describe("ResearchTerminal", () => {
  it("names the session after the company being gathered, lowercased", () => {
    render(<ResearchTerminal lines={[]} company="Stripe" />);

    expect(screen.getByText("interview-resources · stripe")).toBeInTheDocument();
  });

  it("falls back to a generic session name when the company is blank", () => {
    render(<ResearchTerminal lines={[]} company="  " />);

    expect(screen.getByText("interview-resources · research")).toBeInTheDocument();
  });

  it("shows a placeholder until the first event streams in", () => {
    render(<ResearchTerminal lines={[]} company="Stripe" />);

    expect(screen.getByText("establishing feed…")).toBeInTheDocument();
  });

  it("renders each streamed event with its stage keyword", () => {
    render(
      <ResearchTerminal
        lines={[
          line({ id: 0, stage: "plan", message: "Building research plan..." }),
          line({ id: 1, stage: "gather", message: "Gathering evidence from the web..." }),
        ]}
        company="Stripe"
      />
    );

    // Stage keywords also appear in the footer tracker, hence getAllByText.
    expect(screen.getAllByText("plan").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Building research plan...")).toBeInTheDocument();
    expect(screen.getByText("Gathering evidence from the web...")).toBeInTheDocument();
  });

  it("marks the completed and current stages in the footer tracker", () => {
    render(
      <ResearchTerminal
        lines={[
          line({ id: 0, stage: "plan" }),
          line({ id: 1, stage: "gather", message: "Gathering..." }),
        ]}
        company="Stripe"
      />
    );

    // The tracker duplicates the log's stage words; both must exist.
    expect(screen.getAllByText("plan").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("gather").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("compress")).toBeInTheDocument();
    expect(screen.getByText("synthesize")).toBeInTheDocument();
  });

  it("folds the broaden wave into the gather stage on the tracker", () => {
    render(
      <ResearchTerminal
        lines={[line({ id: 0, stage: "broaden", message: "Public interview data is thin..." })]}
        company="Stripe"
      />
    );

    // broaden appears in the log but never as a tracker stage of its own.
    expect(screen.getAllByText("broaden")).toHaveLength(1);
  });

  it("renders an error event without crashing once the run has failed", () => {
    render(
      <ResearchTerminal
        lines={[
          line({ id: 0, stage: "plan" }),
          line({ id: 1, stage: "error", message: "Budget exhausted" }),
        ]}
        company="Stripe"
        failed
      />
    );

    expect(screen.getByText("Budget exhausted")).toBeInTheDocument();
  });
});
