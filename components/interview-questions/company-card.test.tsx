import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { PublishedPageCard } from "@/lib/publishing/company-pages";

import { CompanyCard } from "./company-card";

function card(over: Partial<PublishedPageCard> = {}): PublishedPageCard {
  return {
    slug: "basis-theory",
    companyName: "Basis Theory",
    publishedAt: new Date("2026-07-20"),
    blurb: "A tokenisation platform for card data.",
    questionCount: 6,
    evidenceCount: 4,
    sourceCount: 9,
    categories: ["dsa", "system_design"],
    ...over,
  };
}

describe("CompanyCard", () => {
  it("links to the company page", () => {
    render(<CompanyCard page={card()} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/interview-questions/basis-theory");
  });

  it("shows the counts that tell a visitor which company is worth opening", () => {
    render(<CompanyCard page={card()} />);
    expect(screen.getByText(/6 questions/)).toBeInTheDocument();
    expect(screen.getByText(/4 evidenced/)).toBeInTheDocument();
    expect(screen.getByText(/9 sources/)).toBeInTheDocument();
  });

  it("labels categories for readers rather than showing the stored identifier", () => {
    render(<CompanyCard page={card()} />);
    expect(screen.getByText("System Design")).toBeInTheDocument();
    expect(screen.queryByText("system_design")).not.toBeInTheDocument();
  });

  it("collapses categories past the third into a count", () => {
    render(
      <CompanyCard
        page={card({ categories: ["dsa", "system_design", "behavioral", "hr_culture"] })}
      />
    );
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("renders without a blurb, since the snapshot section can be switched off", () => {
    render(<CompanyCard page={card({ blurb: null })} />);
    expect(screen.getByRole("heading", { name: "Basis Theory" })).toBeInTheDocument();
  });
});
