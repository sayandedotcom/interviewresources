import { siteConfig } from "@/site";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UnknownCompaniesSection } from "./unknown-companies-section";

const { unknownCompanies } = siteConfig.copy;

describe("UnknownCompaniesSection", () => {
  it("renders the section heading", () => {
    render(<UnknownCompaniesSection />);
    expect(
      screen.getByRole("heading", { level: 2, name: unknownCompanies.title })
    ).toBeInTheDocument();
  });

  it("names all four proxy signals", () => {
    render(<UnknownCompaniesSection />);
    for (const signal of unknownCompanies.signals) {
      expect(screen.getByRole("heading", { level: 3, name: signal.name })).toBeInTheDocument();
    }
  });

  it("shows the evidence shortfall that triggers the second pass", () => {
    render(<UnknownCompaniesSection />);
    expect(screen.getByText(unknownCompanies.panel.threshold)).toBeInTheDocument();
    expect(screen.getByText(unknownCompanies.panel.thresholdLabel)).toBeInTheDocument();
    expect(screen.getByText(unknownCompanies.panel.broaden)).toBeInTheDocument();
  });
});
