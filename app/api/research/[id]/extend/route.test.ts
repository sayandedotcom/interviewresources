import { beforeEach, describe, expect, it, vi } from "vitest";

import { BudgetTracker } from "@/lib/research/budget";
import type { Report } from "@/lib/research/types";
import type { SessionUser } from "@/lib/session";

vi.mock("@/lib/session");
vi.mock("@/lib/research/pipeline");
vi.mock("@/lib/events", () => ({ recordProductEvent: vi.fn() }));
vi.mock("@/lib/db/index", () => ({ db: { select: vi.fn(), update: vi.fn() } }));
vi.mock("@/lib/credits", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/credits")>();
  return { ...actual, getBalance: vi.fn(), chargeCredits: vi.fn() };
});

const { getSessionUser } = await import("@/lib/session");
const { runResearchPipeline } = await import("@/lib/research/pipeline");
const { chargeCredits, getBalance } = await import("@/lib/credits");
const { db } = await import("@/lib/db/index");
const { POST } = await import("./route");

const sessionMock = vi.mocked(getSessionUser);
const pipelineMock = vi.mocked(runResearchPipeline);
const balanceMock = vi.mocked(getBalance);
const chargeMock = vi.mocked(chargeCredits);
const selectMock = vi.mocked(db.select);
const updateMock = vi.mocked(db.update);

const user: SessionUser = {
  id: "user-1",
  email: "ada@example.com",
  name: "Ada",
  image: null,
};

const ctx = { params: Promise.resolve({ id: "research-1" }) };

function question(overrides: Partial<Report["questions"][number]> = {}) {
  return {
    category: "dsa",
    question: "LRU cache",
    confidence: "high" as const,
    rationale: "r",
    prepNote: "p",
    evidenceUrls: ["https://a.dev"],
    basis: "evidence" as const,
    ...overrides,
  };
}

const existingReport: Report = {
  companySnapshot: "Payments",
  companyExplainer: "Stripe moves money.",
  likelyLoopStructure: "Screen then onsite",
  interviewerSummary: null,
  questions: [question()],
  prepPlan: ["Drill"],
  interviewExperiences: [{ title: "Exp A", url: "https://exp-a.dev", why: "w" }],
  importantLinks: [{ title: "A", url: "https://a.dev", why: "w" }],
};

/** What the pipeline returns for the extension run. */
const additionReport: Report = {
  companySnapshot: "ignored",
  companyExplainer: "ignored",
  likelyLoopStructure: "ignored",
  interviewerSummary: "ignored",
  questions: [question({ question: "Two sum" })],
  prepPlan: ["ignored"],
  interviewExperiences: [
    { title: "Exp A dup", url: "https://exp-a.dev", why: "dup" },
    { title: "Exp B", url: "https://exp-b.dev", why: "new" },
  ],
  importantLinks: [
    { title: "A dup", url: "https://a.dev", why: "dup" },
    { title: "B", url: "https://b.dev", why: "new" },
  ],
};

function post(body: unknown, id = "research-1") {
  return new Request(`https://test.local/api/research/${id}/extend`, {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function readSse(res: Response): Promise<Record<string, unknown>[]> {
  const text = await res.text();
  return text
    .split("\n\n")
    .filter((chunk) => chunk.startsWith("data: "))
    .map((chunk) => JSON.parse(chunk.slice("data: ".length)));
}

/** The route's single joined select; `row` of undefined models "not found". */
function stubSelect(row: Record<string, unknown> | undefined) {
  selectMock.mockImplementation((() => ({
    from: vi.fn(() => ({
      innerJoin: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn(async () => (row ? [row] : [])) })),
      })),
    })),
  })) as unknown as typeof db.select);
}

function stubUpdate() {
  const updates: Record<string, unknown>[] = [];
  updateMock.mockImplementation((() => ({
    set: vi.fn((v: Record<string, unknown>) => {
      updates.push(v);
      return { where: vi.fn(async () => undefined) };
    }),
  })) as unknown as typeof db.update);
  return updates;
}

function budgetCosting(usd: number): BudgetTracker {
  const b = new BudgetTracker();
  b.recordLlmCall("synthesize", "gemini-3.1-pro-preview", (usd / 2) * 1_000_000, 0);
  return b;
}

const row = {
  researchId: "research-1",
  companyName: "Stripe",
  roleContext: "Senior BE",
  interviewType: "dsa",
  status: "done",
  costCentsLlm: 20,
  costCentsSearch: 10,
  creditsCharged: 46,
  reportId: "report-1",
  jsonPayload: existingReport,
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.mockResolvedValue(user);
  balanceMock.mockResolvedValue(500);
  chargeMock.mockResolvedValue({ balanceAfter: 480 });
  pipelineMock.mockResolvedValue({ report: additionReport, budget: budgetCosting(0.15) });
  stubSelect(row);
  stubUpdate();
});

describe("authentication and ownership", () => {
  it("rejects an anonymous caller before touching the database", async () => {
    sessionMock.mockResolvedValue(null);

    const res = await POST(post({ interviewTypes: ["dsa"] }), ctx);

    expect(res.status).toBe(401);
    expect(pipelineMock).not.toHaveBeenCalled();
  });

  it("404s a report belonging to another user, indistinguishable from a missing one", async () => {
    stubSelect(undefined);

    const res = await POST(post({ interviewTypes: ["dsa"] }), ctx);

    expect(res.status).toBe(404);
    expect(pipelineMock).not.toHaveBeenCalled();
  });

  it("refuses to extend a run that never finished", async () => {
    stubSelect({ ...row, status: "failed" });

    const res = await POST(post({ interviewTypes: ["dsa"] }), ctx);

    expect(res.status).toBe(409);
    expect(pipelineMock).not.toHaveBeenCalled();
  });
});

describe("input validation", () => {
  it("rejects an empty round list", async () => {
    expect((await POST(post({ interviewTypes: [] }), ctx)).status).toBe(400);
  });

  it("rejects more rounds than one extension should gather", async () => {
    const body = { interviewTypes: ["a", "b", "c", "d", "e", "f"] };
    expect((await POST(post(body), ctx)).status).toBe(400);
  });

  it("rejects malformed json", async () => {
    expect((await POST(post("{ nope"), ctx)).status).toBe(400);
  });

  it("rejects an effort level outside the known set", async () => {
    const res = await POST(post({ interviewTypes: ["dsa"], effort: "extreme" }), ctx);
    expect(res.status).toBe(400);
  });
});

describe("the credit pre-flight check", () => {
  it("rejects a balance below the extend floor with 402", async () => {
    balanceMock.mockResolvedValue(24);

    const res = await POST(post({ interviewTypes: ["dsa"] }), ctx);

    expect(res.status).toBe(402);
    await expect(res.json()).resolves.toEqual({
      error: "insufficient_credits",
      balance: 24,
      required: 25,
    });
    expect(pipelineMock).not.toHaveBeenCalled();
  });

  it("admits a balance exactly at the extend floor, which a full run would reject", async () => {
    balanceMock.mockResolvedValue(25);

    const res = await POST(post({ interviewTypes: ["dsa"] }), ctx);

    expect(res.status).toBe(200);
    await readSse(res);
  });

  it("caps the pipeline budget at what a small balance can pay for", async () => {
    balanceMock.mockResolvedValue(25);

    await readSse(await POST(post({ interviewTypes: ["dsa"] }), ctx));

    // creditsToBudgetUsd(25) = 25 * 0.01 / 1.3 = $0.1923, below the $0.5 extend cap.
    expect(pipelineMock.mock.calls[0][2]).toBeCloseTo(0.1923, 4);
  });

  it("clamps a large balance to the extend cap, not the full-run cap", async () => {
    balanceMock.mockResolvedValue(100_000);

    await readSse(await POST(post({ interviewTypes: ["dsa"] }), ctx));

    expect(pipelineMock.mock.calls[0][2]).toBe(0.5);
  });

  it("scales the extend cap with the chosen effort — half the full-run cap", async () => {
    balanceMock.mockResolvedValue(100_000);

    await readSse(await POST(post({ interviewTypes: ["dsa"], effort: "high" }), ctx));
    expect(pipelineMock.mock.calls[0][2]).toBe(1.0);

    pipelineMock.mockClear();
    await readSse(await POST(post({ interviewTypes: ["dsa"], effort: "low" }), ctx));
    expect(pipelineMock.mock.calls[0][2]).toBe(0.25);
  });
});

describe("the extension run", () => {
  it("tells the pipeline not to repeat questions the report already has", async () => {
    await readSse(await POST(post({ interviewTypes: ["behavioral"] }), ctx));

    const input = pipelineMock.mock.calls[0][0];
    expect(input.excludeQuestions).toEqual(["LRU cache"]);
    expect(input.interviewTypes).toEqual(["behavioral"]);
    expect(input.companyName).toBe("Stripe");
    expect(input.roleContext).toBe("Senior BE");
  });

  it("forwards the chosen effort to the pipeline, defaulting to medium", async () => {
    await readSse(await POST(post({ interviewTypes: ["dsa"], effort: "high" }), ctx));
    expect(pipelineMock.mock.calls[0][0].effort).toBe("high");

    pipelineMock.mockClear();
    await readSse(await POST(post({ interviewTypes: ["dsa"] }), ctx));
    expect(pipelineMock.mock.calls[0][0].effort).toBe("medium");
  });

  it("appends the new questions and keeps the original prose", async () => {
    const events = await readSse(await POST(post({ interviewTypes: ["dsa"] }), ctx));
    const final = events.find((e) => e.kind === "report")!;
    const merged = final.report as Report;

    expect(merged.questions.map((q) => q.question)).toEqual(["LRU cache", "Two sum"]);
    expect(merged.companySnapshot).toBe("Payments");
    expect(merged.interviewerSummary).toBeNull();
    expect(merged.prepPlan).toEqual(["Drill"]);
  });

  it("unions importantLinks without duplicating a url the report already cites", async () => {
    const events = await readSse(await POST(post({ interviewTypes: ["dsa"] }), ctx));
    const merged = (events.find((e) => e.kind === "report")!.report as Report).importantLinks;

    expect(merged.map((l) => l.url)).toEqual(["https://a.dev", "https://b.dev"]);
    expect(merged[0].title).toBe("A"); // the original wins, not the duplicate
  });

  it("unions interviewExperiences without duplicating a url the report already lists", async () => {
    const events = await readSse(await POST(post({ interviewTypes: ["dsa"] }), ctx));
    const merged = (events.find((e) => e.kind === "report")!.report as Report)
      .interviewExperiences!;

    expect(merged.map((l) => l.url)).toEqual(["https://exp-a.dev", "https://exp-b.dev"]);
    expect(merged[0].title).toBe("Exp A"); // the original wins, not the duplicate
  });

  it("merges Research library URLs canonically and upgrades access when an extension reads one", async () => {
    stubSelect({
      ...row,
      jsonPayload: {
        ...existingReport,
        researchResources: [
          {
            title: "Manual result",
            url: "https://example.com/post?utm_source=old",
            why: "Open it",
            kind: "other",
            access: "link_only",
            usedAsEvidence: false,
          },
        ],
      } satisfies Report,
    });
    pipelineMock.mockResolvedValue({
      budget: budgetCosting(0.15),
      report: {
        ...additionReport,
        researchResources: [
          {
            title: "Readable result",
            url: "https://example.com/post#details",
            faviconUrl: "https://icons.example.com/favicon.ico",
            why: "Useful preview",
            kind: "discussion",
            access: "search_preview",
            usedAsEvidence: true,
          },
        ],
      },
    });

    const events = await readSse(await POST(post({ interviewTypes: ["dsa"] }), ctx));
    const resources = (events.find((event) => event.kind === "report")!.report as Report)
      .researchResources;

    expect(resources).toEqual([
      expect.objectContaining({
        title: "Readable result",
        url: "https://example.com/post",
        faviconUrl: "https://icons.example.com/favicon.ico",
        access: "search_preview",
        usedAsEvidence: true,
      }),
    ]);
  });

  it("merges into a report stored before interviewExperiences existed", async () => {
    // Reports written by an older build have no such key at all.
    const legacy = { ...existingReport } as Partial<Report>;
    delete legacy.interviewExperiences;
    stubSelect({ ...row, jsonPayload: legacy });

    const events = await readSse(await POST(post({ interviewTypes: ["dsa"] }), ctx));
    const merged = (events.find((e) => e.kind === "report")!.report as Report)
      .interviewExperiences!;

    expect(merged.map((l) => l.url)).toEqual(["https://exp-a.dev", "https://exp-b.dev"]);
  });

  it("asks the pipeline only for the sections an extension can actually merge", async () => {
    await readSse(await POST(post({ interviewTypes: ["dsa"] }), ctx));

    // The company, loop, and skills prose of an extension is discarded by the
    // merge, so paying to regenerate it would be pure waste.
    expect(pipelineMock.mock.calls[0][0].sections).toEqual(["experiences"]);
  });

  it("skips interview experiences on a report that excluded the section", async () => {
    stubSelect({
      ...row,
      jsonPayload: { ...existingReport, interviewExperiences: null } satisfies Report,
    });

    const events = await readSse(await POST(post({ interviewTypes: ["dsa"] }), ctx));
    const merged = events.find((e) => e.kind === "report")!.report as Report;

    expect(pipelineMock.mock.calls[0][0].sections).toEqual([]);
    // Excluded stays excluded: null, not an empty list, and not resurrected.
    expect(merged.interviewExperiences).toBeNull();
  });

  it("gathers a missing section the caller chose, alongside the experiences refresh", async () => {
    // existingReport has no skillsRequired key, so "skills" is a missing section.
    await readSse(await POST(post({ sections: ["skills"] }), ctx));

    const input = pipelineMock.mock.calls[0][0];
    expect([...input.sections].sort()).toEqual(["experiences", "skills"]);
    expect(input.interviewTypes).toEqual([]);
  });

  it("ignores a chosen section the report already carries", async () => {
    // The company snapshot is already present, so re-gathering it would be waste.
    await readSse(await POST(post({ interviewTypes: ["dsa"], sections: ["company"] }), ctx));

    expect(pipelineMock.mock.calls[0][0].sections).toEqual(["experiences"]);
  });

  it("fills a declined section into the merged report without touching questions", async () => {
    const skills = [{ skill: "Idempotency", why: "Every payment API retries" }];
    pipelineMock.mockResolvedValue({
      report: { ...additionReport, skillsRequired: skills },
      budget: budgetCosting(0.15),
    });

    const events = await readSse(await POST(post({ sections: ["skills"] }), ctx));
    const merged = events.find((e) => e.kind === "report")!.report as Report;

    expect(merged.skillsRequired).toEqual(skills);
    // A sections-only extension gathers no new rounds, so the questions are left be.
    expect(merged.questions.map((q) => q.question)).toEqual(["LRU cache"]);
  });

  it("gathers the recruiter pitch into a report that never had one", async () => {
    // existingReport predates recruiterPitch, so "recruiter" is a missing section.
    const pitch = {
      candidateProfile: "Product-minded engineers",
      presentationTips: ["Lead with impact"],
    };
    pipelineMock.mockResolvedValue({
      report: { ...additionReport, recruiterPitch: pitch },
      budget: budgetCosting(0.15),
    });

    const events = await readSse(await POST(post({ sections: ["recruiter"] }), ctx));
    const merged = events.find((e) => e.kind === "report")!.report as Report;

    const input = pipelineMock.mock.calls[0][0];
    expect([...input.sections].sort()).toEqual(["experiences", "recruiter"]);
    expect(merged.recruiterPitch).toEqual(pitch);
  });

  it("leaves a declined recruiter pitch null when the extension did not gather it", async () => {
    stubSelect({
      ...row,
      jsonPayload: { ...existingReport, recruiterPitch: null } satisfies Report,
    });
    // The pipeline nulls a section it was not asked for, so the merge's ?? has
    // nothing to fill the declined hole with.
    pipelineMock.mockResolvedValue({
      report: { ...additionReport, recruiterPitch: null },
      budget: budgetCosting(0.15),
    });

    const events = await readSse(await POST(post({ interviewTypes: ["dsa"] }), ctx));
    const merged = events.find((e) => e.kind === "report")!.report as Report;

    expect(pipelineMock.mock.calls[0][0].sections).toEqual(["experiences"]);
    expect(merged.recruiterPitch).toBeNull();
  });

  it("rejects an extension that gathers neither a round nor a section", async () => {
    expect((await POST(post({ interviewTypes: [], sections: [] }), ctx)).status).toBe(400);
  });

  it("adds newly gathered rounds to interviewType so the sidebar shows them", async () => {
    const updates = stubUpdate();

    await readSse(await POST(post({ interviewTypes: ["behavioral"] }), ctx));

    const researchUpdate = updates.find((u) => "interviewType" in u)!;
    expect(researchUpdate.interviewType).toBe("dsa,behavioral");
  });

  it("does not duplicate a round already recorded on the research", async () => {
    const updates = stubUpdate();

    await readSse(await POST(post({ interviewTypes: ["dsa"] }), ctx));

    expect(updates.find((u) => "interviewType" in u)!.interviewType).toBe("dsa");
  });

  it("accumulates cost and credits onto the existing totals", async () => {
    const updates = stubUpdate();

    await readSse(await POST(post({ interviewTypes: ["dsa"] }), ctx));

    const researchUpdate = updates.find((u) => "interviewType" in u)!;
    // $0.15 all-LLM run → 15 cents, 20 credits; added to the stored 20c / 46 credits.
    expect(researchUpdate.costCentsLlm).toBe(35);
    expect(researchUpdate.costCentsSearch).toBe(10);
    expect(researchUpdate.creditsCharged).toBe(66);
  });

  it("persists the merged payload back onto the report row", async () => {
    const updates = stubUpdate();

    await readSse(await POST(post({ interviewTypes: ["dsa"] }), ctx));

    const payload = updates.find((u) => "jsonPayload" in u)!.jsonPayload as Report;
    expect(payload.questions).toHaveLength(2);
  });

  it("charges the extension against the ledger with its own reason", async () => {
    await readSse(await POST(post({ interviewTypes: ["dsa"] }), ctx));

    expect(chargeMock).toHaveBeenCalledWith({
      userId: "user-1",
      credits: 20,
      reason: "research_extend",
      researchId: "research-1",
    });
  });

  it("streams progress events through to the client", async () => {
    pipelineMock.mockImplementation(async (_input, onProgress) => {
      onProgress?.({ stage: "gather", message: "Searching: stripe", at: "now" });
      return { report: additionReport, budget: budgetCosting(0.15) };
    });

    const events = await readSse(await POST(post({ interviewTypes: ["dsa"] }), ctx));

    expect(events.some((e) => e.kind === "progress" && e.message === "Searching: stripe")).toBe(
      true
    );
  });
});

describe("failure handling", () => {
  it("emits an error event and charges nothing when the pipeline throws", async () => {
    pipelineMock.mockRejectedValue(new Error("gemini 503"));
    const updates = stubUpdate();

    const events = await readSse(await POST(post({ interviewTypes: ["dsa"] }), ctx));

    expect(events.at(-1)).toMatchObject({ kind: "error", message: "gemini 503" });
    expect(chargeMock).not.toHaveBeenCalled();
    // The stored report must survive a failed extension untouched.
    expect(updates).toHaveLength(0);
  });
});
