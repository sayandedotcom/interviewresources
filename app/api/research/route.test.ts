import { beforeEach, describe, expect, it, vi } from "vitest";

import { reports } from "@/lib/db/schema";
import { BudgetTracker } from "@/lib/research/budget";
import {
  MAX_COMPANY_NAME,
  MAX_EXCLUDE_QUESTIONS,
  MAX_EXCLUDE_QUESTION_LEN,
  MAX_INTERVIEWERS,
  MAX_INTERVIEW_TYPES,
  MAX_INTERVIEW_TYPE_LEN,
  MAX_ROLE_CONTEXT,
  type Report,
} from "@/lib/research/types";
import type { SessionUser } from "@/lib/session";

vi.mock("@/lib/session");
vi.mock("@/lib/research/pipeline");
vi.mock("@/lib/db/index", () => ({ db: { insert: vi.fn(), update: vi.fn() } }));
vi.mock("@/lib/research/sessions", async (importOriginal) => {
  // Keep the real cap; stub the two functions that talk to the DB.
  const actual = await importOriginal<typeof import("@/lib/research/sessions")>();
  return { ...actual, pruneToLimit: vi.fn(), hasRunInFlight: vi.fn() };
});
vi.mock("@/lib/credits", async (importOriginal) => {
  // Keep the real conversion maths; stub only the two functions that touch the DB.
  const actual = await importOriginal<typeof import("@/lib/credits")>();
  return { ...actual, getBalance: vi.fn(), chargeCredits: vi.fn() };
});

const { getSessionUser } = await import("@/lib/session");
const { runResearchPipeline } = await import("@/lib/research/pipeline");
const { chargeCredits, getBalance } = await import("@/lib/credits");
const { MAX_SESSIONS_PER_USER, hasRunInFlight, pruneToLimit } =
  await import("@/lib/research/sessions");
const { db } = await import("@/lib/db/index");
const { POST } = await import("./route");

const sessionMock = vi.mocked(getSessionUser);
const pipelineMock = vi.mocked(runResearchPipeline);
const balanceMock = vi.mocked(getBalance);
const chargeMock = vi.mocked(chargeCredits);
const pruneMock = vi.mocked(pruneToLimit);
const inFlightMock = vi.mocked(hasRunInFlight);
const insertMock = vi.mocked(db.insert);
const updateMock = vi.mocked(db.update);

const user: SessionUser = {
  id: "user-1",
  email: "ada@example.com",
  name: "Ada",
  image: null,
};

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
  interviewExperiences: [],
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
  sessionMock.mockResolvedValue(user);
  balanceMock.mockResolvedValue(500);
  chargeMock.mockResolvedValue({ balanceAfter: 454 });
  pipelineMock.mockResolvedValue({ report, budget: budgetCosting(0.35) });
  pruneMock.mockResolvedValue(0);
  inFlightMock.mockResolvedValue(false);
  stubDb();
});

describe("session cap", () => {
  it("evicts the oldest runs before inserting, leaving room for this one", async () => {
    await readSse(await POST(post(validBody)));

    expect(pruneMock).toHaveBeenCalledWith(user.id, MAX_SESSIONS_PER_USER - 1);
    expect(pruneMock.mock.invocationCallOrder[0]).toBeLessThan(
      insertMock.mock.invocationCallOrder[0]
    );
  });

  it("does not evict anything for a caller who cannot afford a run", async () => {
    balanceMock.mockResolvedValue(0);

    expect((await POST(post(validBody))).status).toBe(402);
    expect(pruneMock).not.toHaveBeenCalled();
  });
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

describe("the in-flight guard", () => {
  it("refuses a second concurrent run with 409, before any spend", async () => {
    inFlightMock.mockResolvedValue(true);

    const res = await POST(post(validBody));

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: "run_in_flight" });
    expect(pipelineMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("checks the caller before reading their balance", async () => {
    inFlightMock.mockResolvedValue(true);

    await POST(post(validBody));

    expect(balanceMock).not.toHaveBeenCalled();
    expect(pruneMock).not.toHaveBeenCalled();
  });

  it("admits a run when nothing else is going", async () => {
    expect((await POST(post(validBody))).status).toBe(200);
    expect(inFlightMock).toHaveBeenCalledWith(user.id);
  });

  it("never reaches the guard for an anonymous caller", async () => {
    sessionMock.mockResolvedValue(null);

    expect((await POST(post(validBody))).status).toBe(401);
    expect(inFlightMock).not.toHaveBeenCalled();
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

/**
 * These fields land in the synthesize prompt, which is billed per input token on
 * the priciest model — and the BudgetTracker prices a call only once it has
 * returned, so it cannot stop an oversized one. The schema is the only bound.
 *
 * `jobDescription` is the exception, and stays uncapped: the pipeline truncates
 * it, so its prompt contribution is already bounded. See lib/research/types.test.ts.
 */
describe("the input length caps", () => {
  const rejects = async (body: Record<string, unknown>) => {
    const res = await POST(post({ ...validBody, ...body }));
    expect(res.status).toBe(400);
    expect(pipelineMock).not.toHaveBeenCalled();
  };

  it("rejects an oversized company name", async () => {
    await rejects({ companyName: "a".repeat(MAX_COMPANY_NAME + 1) });
  });

  it("rejects an oversized role context", async () => {
    await rejects({ roleContext: "a".repeat(MAX_ROLE_CONTEXT + 1) });
  });

  it("rejects too many rounds to scout", async () => {
    await rejects({ interviewTypes: Array(MAX_INTERVIEW_TYPES + 1).fill("dsa") });
  });

  it("rejects a single round identifier used as a payload", async () => {
    await rejects({ interviewTypes: ["a".repeat(MAX_INTERVIEW_TYPE_LEN + 1)] });
  });

  it("rejects too many interviewers", async () => {
    await rejects({ interviewers: Array(MAX_INTERVIEWERS + 1).fill({ name: "Ada" }) });
  });

  it("rejects a do-not-repeat list long enough to inflate the prompt", async () => {
    await rejects({ excludeQuestions: Array(MAX_EXCLUDE_QUESTIONS + 1).fill("q") });
  });

  it("rejects one oversized do-not-repeat entry", async () => {
    await rejects({ excludeQuestions: ["a".repeat(MAX_EXCLUDE_QUESTION_LEN + 1)] });
  });

  it("admits a realistic body that sits under every cap", async () => {
    const res = await POST(
      post({
        companyName: "Stripe",
        jobDescription: "We are hiring a senior backend engineer. ".repeat(60),
        roleContext: "Senior backend, payments",
        techStack: "Go, Postgres, Kafka",
        yearsExperience: "7",
        interviewTypes: ["dsa", "system_design", "behavioral"],
        interviewers: [{ name: "Ada Lovelace", url: "https://example.com/ada" }],
      })
    );

    expect(res.status).toBe(200);
    expect(pipelineMock).toHaveBeenCalled();
  });
});

describe("interviewer research", () => {
  it("accepts interviewers from any signed-in user", async () => {
    const res = await POST(post({ ...validBody, interviewers: [{ name: "Ada" }] }));

    expect(res.status).toBe(200);
    await readSse(res);
    expect(pipelineMock).toHaveBeenCalledOnce();
  });

  it("forwards the interviewers through to the pipeline", async () => {
    await readSse(await POST(post({ ...validBody, interviewers: [{ name: "Ada" }] })));

    expect(pipelineMock.mock.calls[0][0]).toMatchObject({ interviewers: [{ name: "Ada" }] });
  });

  it("runs fine with no interviewers at all", async () => {
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

  it("clamps a large balance to the default effort's $1 cap", async () => {
    balanceMock.mockResolvedValue(100_000);

    await readSse(await POST(post(validBody)));

    expect(pipelineMock.mock.calls[0][2]).toBe(1.0);
  });
});

describe("the effort level", () => {
  it("defaults to medium when the client omits it", async () => {
    await readSse(await POST(post(validBody)));

    expect(pipelineMock.mock.calls[0][0].effort).toBe("medium");
    expect(pipelineMock.mock.calls[0][2]).toBe(1.0);
  });

  it("raises the budget ceiling to $2 for a high-effort run", async () => {
    balanceMock.mockResolvedValue(100_000);

    await readSse(await POST(post({ ...validBody, effort: "high" })));

    expect(pipelineMock.mock.calls[0][0].effort).toBe("high");
    expect(pipelineMock.mock.calls[0][2]).toBe(2.0);
  });

  it("lowers the budget ceiling to $0.50 for a low-effort run", async () => {
    balanceMock.mockResolvedValue(100_000);

    await readSse(await POST(post({ ...validBody, effort: "low" })));

    expect(pipelineMock.mock.calls[0][2]).toBe(0.5);
  });

  it("still lets a thin balance clamp a high-effort run below its ceiling", async () => {
    balanceMock.mockResolvedValue(50);

    await readSse(await POST(post({ ...validBody, effort: "high" })));

    // creditsToBudgetUsd(50) = $0.3846, far under the $2 high ceiling.
    expect(pipelineMock.mock.calls[0][2]).toBeCloseTo(0.3846, 4);
  });

  it("rejects an effort level the presets have no entry for", async () => {
    const res = await POST(post({ ...validBody, effort: "extreme" }));

    expect(res.status).toBe(400);
    expect(pipelineMock).not.toHaveBeenCalled();
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
    expect(updates.at(-1)).toEqual({ status: "failed", costCentsLlm: 0, costCentsSearch: 0 });
  });

  it("records whatever cost the tracker captured before the pipeline threw", async () => {
    pipelineMock.mockImplementation(async (_input, _onProgress, _capUsd, tracker) => {
      tracker?.recordLlmCall("plan", "gemini-3.1-pro-preview", 100_000, 0); // $0.20
      tracker?.recordTavilyCredits("gather", 5, "searches"); // $0.04
      throw new Error("gemini 503");
    });

    const { updates } = stubDb();
    await readSse(await POST(post(validBody)));

    expect(updates.at(-1)).toEqual({ status: "failed", costCentsLlm: 20, costCentsSearch: 4 });
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
    expect(updates.at(-1)).toEqual({ status: "failed", costCentsLlm: 0, costCentsSearch: 0 });
    expect(frames.at(-1)).toMatchObject({ kind: "error" });
  });
});
