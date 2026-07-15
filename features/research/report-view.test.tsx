import { render, screen, waitFor, within } from "@testing-library/react";
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
    basis: "evidence",
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
    skillsRequired: [],
    prepPlan: ["Drill LRU cache", "Read the engineering blog"],
    interviewExperiences: [],
    importantLinks: [],
    ...overrides,
  };
}

const base = { costUsd: 0.35, creditsCharged: 46, company: "Stripe" };

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

  it("hides the company section on a report that excluded it", () => {
    render(
      <ReportView {...base} report={report({ companySnapshot: null, companyExplainer: null })} />
    );

    expect(screen.queryByText("The company")).not.toBeInTheDocument();
    expect(screen.queryByText("In plain terms")).not.toBeInTheDocument();
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

  it("renders each required skill as a badge", () => {
    render(
      <ReportView
        {...base}
        report={report({
          skillsRequired: [
            { skill: "Idempotency", why: "Every payment API retries" },
            { skill: "Web agent architecture", why: "Their product drives a browser autonomously" },
          ],
        })}
      />
    );

    expect(screen.getByText("Skills required")).toBeInTheDocument();
    expect(screen.getByText("Idempotency")).toBeInTheDocument();
    expect(screen.getByText("Web agent architecture")).toBeInTheDocument();
  });

  it("hides the skills section when the run excluded it, and on a report predating it", () => {
    const { unmount } = render(<ReportView {...base} report={report({ skillsRequired: null })} />);
    expect(screen.queryByText("Skills required")).not.toBeInTheDocument();
    unmount();

    const legacy = report();
    delete (legacy as Partial<Report>).skillsRequired;
    render(<ReportView {...base} report={legacy} />);
    expect(screen.queryByText("Skills required")).not.toBeInTheDocument();
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

describe("evidence coverage", () => {
  it("shows the limited-data banner when the report was broadened", () => {
    render(<ReportView {...base} report={report({ evidenceCoverage: "sparse" })} />);

    expect(screen.getByText("Limited public data")).toBeInTheDocument();
  });

  it("hides the banner for a well-documented report", () => {
    render(<ReportView {...base} report={report({ evidenceCoverage: "rich" })} />);

    expect(screen.queryByText("Limited public data")).not.toBeInTheDocument();
  });

  it("hides the banner for a legacy report that predates the field", () => {
    render(<ReportView {...base} report={report()} />);

    expect(screen.queryByText("Limited public data")).not.toBeInTheDocument();
  });

  it("tags an inferred question", () => {
    const r = report({
      evidenceCoverage: "sparse",
      questions: [question({ question: "Inferred one", basis: "inferred", confidence: "medium" })],
    });
    render(<ReportView {...base} report={r} />);

    expect(screen.getAllByText("Inferred").length).toBeGreaterThan(0);
  });

  it("shows no inferred tag when every question is evidence-backed", () => {
    const r = report({
      questions: [
        question({ question: "Direct one", basis: "evidence" }),
        question({ question: "Another direct", basis: "evidence" }),
      ],
    });
    render(<ReportView {...base} report={r} />);

    expect(screen.queryByText("Inferred")).not.toBeInTheDocument();
  });

  it("shows no inferred tag for a legacy question missing the basis field", () => {
    const legacy = question();
    delete (legacy as Partial<PredictedQuestion>).basis;
    render(<ReportView {...base} report={report({ questions: [legacy] })} />);

    expect(screen.queryByText("Inferred")).not.toBeInTheDocument();
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

describe("interview experiences", () => {
  const experience = {
    title: "My Stripe E5 onsite",
    url: "https://www.glassdoor.com/i/1",
    why: "A 2024 backend candidate, round by round",
  };

  it("renders each experience with its title, host, and reason", () => {
    render(<ReportView {...base} report={report({ interviewExperiences: [experience] })} />);

    expect(screen.getByRole("link", { name: "My Stripe E5 onsite" })).toHaveAttribute(
      "href",
      "https://www.glassdoor.com/i/1"
    );
    expect(screen.getByText("glassdoor.com")).toBeInTheDocument();
    expect(screen.getByText("A 2024 backend candidate, round by round")).toBeInTheDocument();
  });

  it("places the section after the prep plan and before worth reading", () => {
    const r = report({
      interviewExperiences: [experience],
      importantLinks: [{ title: "Eng blog", url: "https://stripe.com/blog", why: "stack" }],
    });
    render(<ReportView {...base} report={r} />);

    const known = ["Prep plan", "Interview experiences", "Worth reading"];
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => known.find((label) => h.textContent?.includes(label)))
      .filter((label): label is string => Boolean(label));

    expect(headings).toEqual(known);
  });

  it("hides the section when no experience was found", () => {
    render(<ReportView {...base} report={report()} />);

    expect(screen.queryByText("Interview experiences")).not.toBeInTheDocument();
  });

  it("survives an older stored report that predates interviewExperiences", () => {
    const { interviewExperiences: _gone, ...legacy } = report();

    expect(() => render(<ReportView {...base} report={legacy as Report} />)).not.toThrow();
    expect(screen.queryByText("Interview experiences")).not.toBeInTheDocument();
  });
});

describe("cost and export", () => {
  /** The badge shows the bare number; "credits" only appears in its tooltip. */
  const creditsBadge = () => screen.queryByTestId("credits-badge");

  it("shows the credits charged as a badge", () => {
    render(<ReportView {...base} report={report()} />);

    expect(creditsBadge()).toHaveTextContent("46");
  });

  it("reveals the metered dollar cost when the badge is hovered", async () => {
    render(<ReportView {...base} report={report()} />);

    await userEvent.hover(creditsBadge()!);

    expect(await screen.findByText(/46 credits · \$0\.3500 metered/)).toBeInTheDocument();
  });

  it("hides the cost badge for a report whose charge was never recorded", () => {
    render(<ReportView {...base} creditsCharged={null} report={report()} />);

    expect(creditsBadge()).not.toBeInTheDocument();
  });

  it("names only the credits when the dollar cost is unknown", async () => {
    render(<ReportView {...base} costUsd={null} report={report()} />);

    await userEvent.hover(creditsBadge()!);

    expect(await screen.findByText("46 credits")).toBeInTheDocument();
    expect(screen.queryByText(/metered/)).not.toBeInTheDocument();
  });

  it("shows a zero charge rather than hiding it", () => {
    render(<ReportView {...base} creditsCharged={0} report={report()} />);

    expect(creditsBadge()).toHaveTextContent("0");
  });

  it("groups digits so a large charge stays readable", () => {
    render(<ReportView {...base} creditsCharged={1234} report={report()} />);

    expect(creditsBadge()).toHaveTextContent("1,234");
  });

  /** Stubs the object-URL plumbing and returns the spy on the download anchor. */
  function stubDownload() {
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => "blob:report");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    return { createObjectURL, revokeObjectURL, click };
  }

  const openMenu = () => userEvent.click(screen.getByRole("button", { name: /download/i }));

  it("offers both the pdf and the json to every user", async () => {
    render(<ReportView {...base} report={report()} />);
    await openMenu();

    expect(await screen.findByRole("menuitem", { name: /pdf/i })).toBeInTheDocument();
    expect(await screen.findByRole("menuitem", { name: /json/i })).toBeInTheDocument();
  });

  it("downloads a slugged json file when the user picks JSON", async () => {
    const { createObjectURL, revokeObjectURL, click } = stubDownload();

    render(<ReportView {...base} company="Acme Corp!" report={report()} />);
    await openMenu();
    await userEvent.click(await screen.findByRole("menuitem", { name: /json/i }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:report");

    const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(anchor.download).toBe("scouting-report-acme-corp.json");
  });

  it("falls back to a generic filename when the company name has no usable characters", async () => {
    const { click } = stubDownload();

    render(<ReportView {...base} company="!!!" report={report()} />);
    await openMenu();
    await userEvent.click(await screen.findByRole("menuitem", { name: /json/i }));

    const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(anchor.download).toBe("scouting-report-report.json");
  });

  it("downloads a slugged pdf when the user picks PDF", async () => {
    const { createObjectURL, click } = stubDownload();

    render(<ReportView {...base} company="Acme Corp!" report={report()} />);
    await openMenu();
    await userEvent.click(await screen.findByRole("menuitem", { name: /pdf/i }));

    // The renderer arrives through a dynamic import, so the anchor is a tick late.
    await vi.waitFor(() => expect(click).toHaveBeenCalledOnce());

    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(0);

    const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(anchor.download).toBe("scouting-report-acme-corp.pdf");
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

describe("extend controls", () => {
  /** An SSE body carrying one report event, as the extend route would stream it. */
  function sseBody(merged: Report): ReadableStream<Uint8Array> {
    const payload = `data: ${JSON.stringify({ kind: "report", report: merged })}\n\n`;
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(payload));
        controller.close();
      },
    });
  }

  /**
   * Neither extend button spends anything on its own — both only open the
   * confirmation. This is the click that actually starts the pipeline.
   */
  async function confirmScout() {
    await screen.findByRole("alertdialog");
    await userEvent.click(screen.getByRole("button", { name: /^scout$/i }));
  }

  it("hides the extend UI for a report that has no id yet", () => {
    render(<ReportView {...base} report={report()} />);

    expect(screen.queryByText("Scout more rounds")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add more/i })).not.toBeInTheDocument();
  });

  it("shows a More button per section and the rounds footer once persisted", () => {
    render(<ReportView {...base} report={report()} researchId="r-1" />);

    expect(screen.getByText("Scout more rounds")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add more algorithmic coding questions/i })
    ).toBeInTheDocument();
  });

  it("hides the Report Sections card when the report already has every section", () => {
    render(<ReportView {...base} report={report()} researchId="r-1" />);

    expect(screen.queryByText("Report Sections")).not.toBeInTheDocument();
  });

  it("offers only the sections this report is missing", () => {
    render(
      <ReportView
        {...base}
        report={report({
          companySnapshot: null,
          companyExplainer: null,
          interviewExperiences: null,
        })}
        researchId="r-1"
      />
    );

    expect(screen.getByText("Report Sections")).toBeInTheDocument();
    // company and experiences are missing; loop and skills are present.
    expect(screen.getByRole("button", { name: /the company/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /interview experiences/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /the loop/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /skills required/i })).not.toBeInTheDocument();
  });

  it("scouts a chosen missing section through the extend route", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, body: sseBody(report()) } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(<ReportView {...base} report={report({ skillsRequired: null })} researchId="r-1" />);
    await userEvent.click(screen.getByRole("button", { name: /skills required/i }));
    await userEvent.click(screen.getByRole("button", { name: /scout these rounds/i }));
    await confirmScout();

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      interviewTypes: [],
      sections: ["skills"],
      effort: "medium",
    });
    vi.unstubAllGlobals();
  });

  it("asks the extend route for more questions in just that section's category", async () => {
    const merged = report({ questions: [question(), question({ question: "Two sum" })] });
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, body: sseBody(merged) } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(<ReportView {...base} report={report()} researchId="r-1" />);
    await userEvent.click(
      screen.getByRole("button", { name: /add more algorithmic coding questions/i })
    );
    await confirmScout();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/research/r-1/extend");
    expect(JSON.parse(init.body)).toEqual({
      interviewTypes: ["dsa"],
      sections: [],
      effort: "medium",
    });

    // The merged report replaces what was rendered.
    expect(await screen.findByText("Two sum")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("surfaces an extend failure without destroying the report on screen", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      json: async () => ({ error: "insufficient_credits", balance: 3, required: 25 }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(<ReportView {...base} report={report()} researchId="r-1" />);
    await userEvent.click(
      screen.getByRole("button", { name: /add more algorithmic coding questions/i })
    );
    await confirmScout();

    expect(await screen.findByText(/not enough credits/i)).toBeInTheDocument();
    expect(screen.getByText("Implement an LRU cache")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("omits rounds the report already covers from the footer picker", () => {
    render(<ReportView {...base} report={report()} researchId="r-1" />);
    const footer = screen.getByText("Scout more rounds").parentElement!;

    // dsa is already in the report, so only its "More" button offers it.
    expect(
      within(footer).queryByRole("button", { name: /Algorithmic Coding/ })
    ).not.toBeInTheDocument();
    expect(within(footer).getByRole("button", { name: /Behavioral/ })).toBeInTheDocument();
  });

  it("scouts the rounds picked in the footer", async () => {
    const merged = report({
      questions: [question(), question({ category: "behavioral", question: "Conflict story" })],
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, body: sseBody(merged) } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(<ReportView {...base} report={report()} researchId="r-1" />);
    const footer = screen.getByText("Scout more rounds").parentElement!;
    await userEvent.click(within(footer).getByRole("button", { name: /Behavioral/ }));
    await userEvent.click(screen.getByRole("button", { name: /scout these rounds/i }));
    await confirmScout();

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      interviewTypes: ["behavioral"],
      sections: [],
      effort: "medium",
    });
    expect(await screen.findByText("Conflict story")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("sends the effort picked in the footer, for the rounds form and the More buttons", async () => {
    const merged = report({ questions: [question(), question({ question: "Two sum" })] });
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, body: sseBody(merged) } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReportView
        {...base}
        report={report()}
        researchId="r-1"
        extendCredits={{ low: 33, medium: 65, high: 130 }}
      />
    );
    const rail = screen.getByTestId("estimate-rail");
    await userEvent.click(within(rail).getByRole("button", { name: /High/ }));

    // A "More" click uses the same shared effort state as the estimate rail.
    await userEvent.click(
      screen.getByRole("button", { name: /add more algorithmic coding questions/i })
    );
    await confirmScout();

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      interviewTypes: ["dsa"],
      sections: [],
      effort: "high",
    });
    vi.unstubAllGlobals();
  });

  it("quotes the round and the credit range before an extension spends anything", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReportView
        {...base}
        report={report()}
        researchId="r-1"
        extendCredits={{ low: 33, medium: 65, high: 130 }}
      />
    );
    await userEvent.click(
      screen.getByRole("button", { name: /add more algorithmic coding questions/i })
    );

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(/medium-effort extension/i);
    expect(dialog).toHaveTextContent(/Algorithmic Coding/);
    expect(dialog).toHaveTextContent(/\d+–\d+ credits and capped at 65/);

    // The dialog is a gate, not a receipt: nothing has run yet.
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("extends nothing when the confirmation is cancelled", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<ReportView {...base} report={report()} researchId="r-1" />);
    await userEvent.click(
      screen.getByRole("button", { name: /add more algorithmic coding questions/i })
    );
    await screen.findByRole("alertdialog");
    await userEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalled();
    // Cancelling leaves the report exactly as it was.
    expect(screen.getByText("Implement an LRU cache")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("prices each extension effort when the ceilings are supplied", () => {
    render(
      <ReportView
        {...base}
        report={report()}
        researchId="r-1"
        extendCredits={{ low: 33, medium: 65, high: 130 }}
      />
    );
    const rail = screen.getByTestId("estimate-rail");

    // The effort picker shows each level's ceiling; "high" caps at 130.
    expect(within(rail).getByText("130")).toBeInTheDocument();
  });

  it("keeps the scout button disabled until a round is picked", () => {
    render(<ReportView {...base} report={report()} researchId="r-1" />);

    expect(screen.getByRole("button", { name: /scout these rounds/i })).toBeDisabled();
  });

  it("estimates what an extension will cost, and says it is only an estimate", () => {
    render(
      <ReportView
        {...base}
        report={report()}
        researchId="r-1"
        extendCredits={{ low: 33, medium: 65, high: 130 }}
        balance={200}
      />
    );
    const estimate = screen.getByTestId("estimate-rail");

    expect(within(estimate).getByText("credits")).toBeInTheDocument();
    expect(within(estimate).getByText(/min to generate/)).toBeInTheDocument();
    expect(within(estimate).getByText(/Estimate only/)).toBeInTheDocument();
  });

  it("re-prices the extension when the user reaches for a heavier effort", async () => {
    render(
      <ReportView
        {...base}
        report={report()}
        researchId="r-1"
        extendCredits={{ low: 33, medium: 65, high: 130 }}
        balance={200}
      />
    );
    const estimate = () => screen.getByTestId("estimate-rail").textContent!;
    const before = estimate();

    const rail = screen.getByTestId("estimate-rail");
    await userEvent.click(within(rail).getByRole("button", { name: /High/ }));

    expect(estimate()).not.toEqual(before);
  });

  it("warns before the user spends credits they do not have", () => {
    render(
      <ReportView
        {...base}
        report={report()}
        researchId="r-1"
        extendCredits={{ low: 33, medium: 65, high: 130 }}
        balance={5}
      />
    );

    expect(screen.getByText(/could cost more than your 5 credits/)).toBeInTheDocument();
  });

  it("prices nothing until the extension ceilings arrive", () => {
    render(<ReportView {...base} report={report()} researchId="r-1" />);

    expect(screen.queryByTestId("estimate-rail")).not.toBeInTheDocument();
  });
});

describe("copy as prompt", () => {
  function stubClipboard(writeText: ReturnType<typeof vi.fn>) {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
  }

  // The header button is a dropdown: open it, then pick a variant.
  async function copyVariant(name: RegExp) {
    await userEvent.click(screen.getByRole("button", { name: /copy as prompt/i }));
    await userEvent.click(await screen.findByRole("menuitem", { name }));
  }

  it("copies an answer-me prompt built from the report to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);

    render(<ReportView {...base} report={report()} />);
    await copyVariant(/get every question answered/i);

    expect(writeText).toHaveBeenCalledOnce();
    const prompt = writeText.mock.calls[0][0] as string;
    expect(prompt).toContain("technical interview at Stripe");
    expect(prompt).toContain("Implement an LRU cache");
  });

  it("copies a mock-interview prompt when that variant is chosen", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);

    render(<ReportView {...base} report={report()} />);
    await copyVariant(/mock interview — full loop/i);

    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText.mock.calls[0][0]).toContain("You are an experienced interviewer at Stripe");
  });

  it("copies the extended report, not the one it first rendered", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);

    const { rerender } = render(<ReportView {...base} report={report()} />);
    rerender(
      <ReportView
        {...base}
        report={report({ questions: [question({ question: "Design a rate limiter" })] })}
      />
    );
    await copyVariant(/get every question answered/i);

    expect(writeText.mock.calls[0][0]).toContain("Design a rate limiter");
  });

  it("confirms with Copied, then reverts", async () => {
    stubClipboard(vi.fn().mockResolvedValue(undefined));

    render(<ReportView {...base} report={report()} />);
    await userEvent.click(screen.getByRole("button", { name: /copy as prompt/i }));
    await userEvent.click(
      await screen.findByRole("menuitem", { name: /get every question answered/i })
    );

    expect(await screen.findByText("Copied")).toBeInTheDocument();
    // The label reverts on a 2s timer, past waitFor's default 1s budget.
    await waitFor(() => expect(screen.getByText("Copy as Prompt")).toBeInTheDocument(), {
      timeout: 2500,
    });
  });

  it("tells the user when the browser denied clipboard access", async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));

    render(<ReportView {...base} report={report()} />);
    await copyVariant(/get every question answered/i);

    expect(await screen.findByText("Copy failed")).toBeInTheDocument();
  });

  it("offers the button whenever a report is on screen", () => {
    render(<ReportView {...base} report={report()} />);

    expect(screen.getByRole("button", { name: /copy as prompt/i })).toBeInTheDocument();
  });

  it("copies a single round when using that round's copy menu", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);

    render(
      <ReportView
        {...base}
        report={report({
          questions: [
            question({ category: "dsa", question: "Implement an LRU cache" }),
            question({ category: "behavioral", question: "Tell me about a conflict" }),
          ],
        })}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /copy behavioral as prompt/i }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /copy answers prompt/i }));

    const prompt = writeText.mock.calls[0][0] as string;
    expect(prompt).toContain("Tell me about a conflict");
    expect(prompt).not.toContain("Implement an LRU cache");
  });
});
