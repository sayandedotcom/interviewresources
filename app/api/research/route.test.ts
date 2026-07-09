import { beforeEach, describe, expect, it, vi } from "vitest";

import { reports } from "@/lib/db/schema";
import { BudgetTracker } from "@/lib/research/budget";
import type { Report } from "@/lib/research/types";
import type { SessionUser } from "@/lib/session";

vi.mock("@/lib/session");
vi.mock("@/lib/research/pipeline");
vi.mock("@/lib/db/index", () => ({ db: { insert: vi.fn(), update: vi.fn() } }));
vi.mock("@/lib/credits", async (importOriginal) => {
  // Keep the real conversion maths; stub only the two functions that touch the DB.
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
const insertMock = vi.mocked(db.insert);
const updateMock = vi.mocked(db.update);

const freeUser: SessionUser = {
  id: "user-1",
  email: "ada@example.com",
  name: "Ada",
  image: null,
  tier: "free",
};
const proUser: SessionUser = { ...freeUser, id: "user-2", tier: "pro" };

const validBody = { companyName: "Stripe", interviewTypes: ["dsa"] };

const report: Report = {
  companySnapshot: "Payments",
  companyExplainer: "Stripe moves money when you pay online.",
  likelyLoopStructure: "Screen then onsite",
  interviewerSummary: null,
  questions: [
    {
      category: "dsa",
      question: "LRU cache",
      confidence: "high",
      rationale: "r",
      prepNote: "p",
      evidenceUrls: ["https://a.dev"],
    },
  ],
  prepPlan: ["Drill"],
  importantLinks: [],
};

function post(body: unknown) {
  return new Request("https://test.local/api/research", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** Collects an SSE body into the list of parsed `data:` payloads. */
async function readSse(res: Response): Promise<Record<string, unknown>[]> {
  const text = await res.text();
  return text
    .split("\n\n")
    .filter((chunk) => chunk.startsWith("data: "))
    .map((chunk) => JSON.parse(chunk.slice("data: ".length)));
}

/** Records what the route writes, and lets a test make any write blow up. */
function stubDb() {
  const updates: Record<string, unknown>[] = [];
  const reportInserts: Record<string, unknown>[] = [];

  // Drizzle's builder types are far richer than the three calls the route makes,
  // so the stubs are cast rather than structurally satisfied.
  insertMock.mockImplementation(((table: unknown) => {
    if (table === reports) {
      return { values: vi.fn(async (v: Record<string, unknown>) => void reportInserts.push(v)) };
    }
    return {
      values: vi.fn(() => ({ returning: vi.fn(async () => [{ id: "research-1" }]) })),
    };
  }) as unknown as typeof db.insert);

  updateMock.mockImplementation((() => ({
    set: vi.fn((v: Record<string, unknown>) => {
      updates.push(v);
      return { where: vi.fn(async () => undefined) };
    }),
  })) as unknown as typeof db.update);

  return { updates, reportInserts };
}

function budgetCosting(usd: number): BudgetTracker {
  const b = new BudgetTracker();
  // 1M input tokens on the pro model is exactly $2; scale to the target spend.
  b.recordLlmCall("synthesize", "gemini-3.1-pro-preview", (usd / 2) * 1_000_000, 0);
  return b;
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.mockResolvedValue(freeUser);
  balanceMock.mockResolvedValue(500);
  chargeMock.mockResolvedValue({ balanceAfter: 454 });
  pipelineMock.mockResolvedValue({ report, budget: budgetCosting(0.35) });
  stubDb();
});

describe("authentication", () => {
  it("rejects an anonymous caller before touching the balance or the pipeline", async () => {
    sessionMock.mockResolvedValue(null);

    const res = await POST(post(validBody));

    expect(res.status).toBe(401);
    expect(balanceMock).not.toHaveBeenCalled();
    expect(pipelineMock).not.toHaveBeenCalled();
  });
});

describe("input validation", () => {
  it("rejects a body that fails the schema", async () => {
    const res = await POST(post({ companyName: "" }));

    expect(res.status).toBe(400);
    expect(pipelineMock).not.toHaveBeenCalled();
  });

  it("rejects malformed json", async () => {
    expect((await POST(post("{ nope"))).status).toBe(400);
  });

  it("rejects a request with no rounds to scout", async () => {
    expect((await POST(post({ companyName: "Stripe", interviewTypes: [] }))).status).toBe(400);
  });
});

describe("the Pro gate on interviewer research", () => {
  it("rejects a free user who supplies interviewers", async () => {
    const res = await POST(post({ ...validBody, interviewers: [{ name: "Ada" }] }));

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ error: "pro_required" });
    expect(pipelineMock).not.toHaveBeenCalled();
  });

  it("does not silently strip interviewers — a tampered client must fail loudly", async () => {
    const res = await POST(post({ ...validBody, interviewers: [{ name: "Ada" }] }));

    expect(res.status).toBe(403);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("allows a Pro user to supply interviewers", async () => {
    sessionMock.mockResolvedValue(proUser);

    const res = await POST(post({ ...validBody, interviewers: [{ name: "Ada" }] }));

    expect(res.status).toBe(200);
    await readSse(res);
    expect(pipelineMock).toHaveBeenCalledOnce();
  });

  it("allows a free user who supplies no interviewers", async () => {
    const res = await POST(post(validBody));

    expect(res.status).toBe(200);
    await readSse(res);
  });
});

describe("the credit pre-flight check", () => {
  it("rejects a balance below the run floor with 402", async () => {
    balanceMock.mockResolvedValue(49);

    const res = await POST(post(validBody));

    expect(res.status).toBe(402);
    await expect(res.json()).resolves.toEqual({
      error: "insufficient_credits",
      balance: 49,
      required: 50,
    });
    expect(pipelineMock).not.toHaveBeenCalled();
  });

  it("rejects a zero balance", async () => {
    balanceMock.mockResolvedValue(0);
    expect((await POST(post(validBody))).status).toBe(402);
  });

  it("rejects a negative balance left by a raced run", async () => {
    balanceMock.mockResolvedValue(-5);
    expect((await POST(post(validBody))).status).toBe(402);
  });

  it("admits a balance exactly at the floor", async () => {
    balanceMock.mockResolvedValue(50);

    const res = await POST(post(validBody));

    expect(res.status).toBe(200);
    await readSse(res);
  });

  it("shrinks the pipeline budget to what a small balance can pay for", async () => {
    balanceMock.mockResolvedValue(50);

    await readSse(await POST(post(validBody)));

    // creditsToBudgetUsd(50) = 50 * 0.01 / 1.3 = $0.3846
    expect(pipelineMock.mock.calls[0][2]).toBeCloseTo(0.3846, 4);
  });

  it("clamps a large balance to the $1 hard cap", async () => {
    balanceMock.mockResolvedValue(100_000);

    await readSse(await POST(post(validBody)));

    expect(pipelineMock.mock.calls[0][2]).toBe(1.0);
  });
});

describe("the streaming response", () => {
  it("responds with SSE headers and no caching", async () => {
    const res = await POST(post(validBody));

    expect(res.headers.get("content-type")).toBe("text/event-stream; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe("no-cache, no-transform");
    await readSse(res);
  });

  it("forwards each pipeline progress event as a progress frame", async () => {
    pipelineMock.mockImplementation(async (_input, onProgress) => {
      onProgress?.({
        stage: "plan",
        message: "Building research plan...",
        at: "2026-07-09T00:00:00Z",
      });
      onProgress?.({ stage: "gather", message: "Searching: stripe", at: "2026-07-09T00:00:01Z" });
      return { report, budget: budgetCosting(0.35) };
    });

    const frames = await readSse(await POST(post(validBody)));

    const progress = frames.filter((f) => f.kind === "progress");
    expect(progress).toHaveLength(2);
    expect(progress[0]).toMatchObject({ stage: "plan", message: "Building research plan..." });
  });

  it("ends with a report frame carrying the cost, the charge, and the new balance", async () => {
    const frames = await readSse(await POST(post(validBody)));

    expect(frames.at(-1)).toMatchObject({
      kind: "report",
      researchId: "research-1",
      costUsd: 0.35,
      creditsCharged: 46, // 0.35 * 1.3 / 0.01, rounded up
      balanceAfter: 454,
    });
  });
});

describe("persistence and billing on success", () => {
  it("records the run as running before the pipeline starts", async () => {
    await readSse(await POST(post(validBody)));

    expect(insertMock).toHaveBeenCalled();
  });

  it("marks the run done and splits cost into llm and search cents", async () => {
    const b = new BudgetTracker();
    b.recordLlmCall("synthesize", "gemini-3.1-pro-preview", 100_000, 0); // $0.20
    b.recordTavilyCredits("gather", 5, "searches"); // $0.04
    pipelineMock.mockResolvedValue({ report, budget: b });

    const { updates } = stubDb();
    await readSse(await POST(post(validBody)));

    expect(updates[0]).toMatchObject({ status: "done", costCentsLlm: 20, costCentsSearch: 4 });
  });

  it("charges the real metered cost, not the budgeted cap", async () => {
    pipelineMock.mockResolvedValue({ report, budget: budgetCosting(0.1) });

    await readSse(await POST(post(validBody)));

    expect(chargeMock).toHaveBeenCalledWith({
      userId: "user-1",
      credits: 13, // 0.10 * 1.3 / 0.01
      reason: "research",
      researchId: "research-1",
    });
  });

  it("stores the report payload against the run", async () => {
    const { reportInserts } = stubDb();

    await readSse(await POST(post(validBody)));

    expect(reportInserts[0]).toMatchObject({ researchId: "research-1", jsonPayload: report });
  });

  it("charges nothing for a run that somehow cost nothing", async () => {
    pipelineMock.mockResolvedValue({ report, budget: new BudgetTracker() });

    await readSse(await POST(post(validBody)));

    expect(chargeMock.mock.calls[0][0].credits).toBe(0);
  });

  it("rounds each cost kind independently, so stored cents can drift from the charge", async () => {
    // $0.004 llm + $0.004 search rounds to 0c + 0c stored, yet bills 2 credits.
    // Pinned as known, benign drift: creditsCharged is the billing truth.
    const b = new BudgetTracker();
    b.recordLlmCall("plan", "gemini-3.1-pro-preview", 2_000, 0); // $0.004
    b.recordTavilyCredits("gather", 0.5, "half"); // $0.004
    pipelineMock.mockResolvedValue({ report, budget: b });

    const { updates } = stubDb();
    await readSse(await POST(post(validBody)));

    expect(updates[0]).toMatchObject({ costCentsLlm: 0, costCentsSearch: 0 });
    expect(chargeMock.mock.calls[0][0].credits).toBe(2);
  });
});

describe("failure handling", () => {
  it("marks the run failed and emits an error frame when the pipeline throws", async () => {
    pipelineMock.mockRejectedValue(new Error("gemini 503"));

    const { updates } = stubDb();
    const frames = await readSse(await POST(post(validBody)));

    expect(frames.at(-1)).toEqual({ kind: "error", message: "gemini 503" });
    expect(updates.at(-1)).toEqual({ status: "failed" });
  });

  it("does not charge the user for a failed run", async () => {
    pipelineMock.mockRejectedValue(new Error("boom"));

    await readSse(await POST(post(validBody)));

    expect(chargeMock).not.toHaveBeenCalled();
  });

  it("still returns HTTP 200 — the failure is carried in the stream, not the status", async () => {
    pipelineMock.mockRejectedValue(new Error("boom"));

    const res = await POST(post(validBody));

    expect(res.status).toBe(200);
    await readSse(res);
  });

  it("stringifies a non-Error rejection rather than emitting undefined", async () => {
    pipelineMock.mockRejectedValue("just a string");

    const frames = await readSse(await POST(post(validBody)));

    expect(frames.at(-1)).toEqual({ kind: "error", message: "just a string" });
  });

  it("closes the stream even when the failure path itself fails", async () => {
    pipelineMock.mockRejectedValue(new Error("boom"));
    updateMock.mockImplementation((() => {
      throw new Error("db down");
    }) as unknown as typeof db.update);

    const res = await POST(post(validBody));

    // `finally { controller.close() }` runs regardless, so the body terminates
    // instead of hanging the client forever.
    await expect(res.text()).resolves.toBeTypeOf("string");
  });

  it("leaves the run marked done and unbilled if charging fails after the report was saved", async () => {
    // Known gap: reports insert and researches update both commit before
    // chargeCredits runs, and none of the three share a transaction.
    chargeMock.mockRejectedValue(new Error("ledger down"));

    const { updates } = stubDb();
    const frames = await readSse(await POST(post(validBody)));

    expect(updates[0]).toMatchObject({ status: "done" });
    expect(updates.at(-1)).toEqual({ status: "failed" });
    expect(frames.at(-1)).toMatchObject({ kind: "error" });
  });
});
