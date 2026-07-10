import { describe, expect, it } from "vitest";

import { BUDGET_CAP_USD, BUDGET_DEGRADE_RATIO, BUDGET_DEGRADE_USD, BudgetTracker } from "./budget";

/** $/1M tokens for the two models the pipeline actually uses. */
const FLASH_LITE_IN = 0.25;
const FLASH_LITE_OUT = 1.5;
const PRO_IN = 2.0;
const PRO_OUT = 12.0;

describe("BudgetTracker.recordLlmCall", () => {
  it("prices input and output tokens separately", () => {
    const b = new BudgetTracker();
    const cost = b.recordLlmCall("plan", "gemini-3.1-flash-lite-preview", 1_000_000, 1_000_000);

    expect(cost).toBeCloseTo(FLASH_LITE_IN + FLASH_LITE_OUT, 10);
    expect(b.totalUsd).toBeCloseTo(1.75, 10);
  });

  it("prices the expensive synthesis model correctly", () => {
    const b = new BudgetTracker();
    b.recordLlmCall("synthesize", "gemini-3.1-pro-preview", 100_000, 10_000);

    // 0.1M * $2 + 0.01M * $12 = $0.20 + $0.12
    expect(b.totalUsd).toBeCloseTo(0.32, 10);
  });

  it("records zero for a call that reported no usage", () => {
    const b = new BudgetTracker();
    expect(b.recordLlmCall("plan", "gemini-3-flash-preview", 0, 0)).toBe(0);
    expect(b.totalUsd).toBe(0);
  });

  it("accumulates across stages", () => {
    const b = new BudgetTracker();
    b.recordLlmCall("plan", "gemini-3.1-flash-lite-preview", 1_000_000, 0);
    b.recordLlmCall("compress", "gemini-3.1-flash-lite-preview", 1_000_000, 0);

    expect(b.totalUsd).toBeCloseTo(FLASH_LITE_IN * 2, 10);
  });

  it("labels the entry with the model and token split for the cost audit trail", () => {
    const b = new BudgetTracker();
    b.recordLlmCall("compress", "gemini-3.5-flash", 500, 200);

    const [entry] = b.breakdown();
    expect(entry).toMatchObject({ stage: "compress", kind: "llm" });
    expect(entry.detail).toBe("gemini-3.5-flash (500in/200out)");
  });
});

describe("BudgetTracker.recordTavilyCredits", () => {
  it("prices a basic search at one credit", () => {
    const b = new BudgetTracker();
    expect(b.recordTavilyCredits("gather", 1, "q")).toBeCloseTo(0.008, 10);
  });

  it("prices an advanced search at two credits", () => {
    const b = new BudgetTracker();
    expect(b.recordTavilyCredits("gather", 2, "q")).toBeCloseTo(0.016, 10);
  });

  it("files search spend under the search kind so the route can split cost by column", () => {
    const b = new BudgetTracker();
    b.recordTavilyCredits("gather", 1, "stripe interview");
    b.recordLlmCall("plan", "gemini-3.1-flash-lite-preview", 100, 100);

    expect(b.breakdown().filter((e) => e.kind === "search")).toHaveLength(1);
    expect(b.breakdown().filter((e) => e.kind === "llm")).toHaveLength(1);
  });
});

describe("degrade and stop thresholds", () => {
  it("does not degrade on a fresh tracker", () => {
    const b = new BudgetTracker();
    expect(b.shouldDegrade()).toBe(false);
    expect(b.shouldStop()).toBe(false);
  });

  it("degrades at exactly 85% of the cap, not one cent later", () => {
    const b = new BudgetTracker();
    // 0.85 / 0.008 = 106.25 credits. Use the LLM path for an exact figure.
    b.recordLlmCall("gather", "gemini-3.1-pro-preview", 425_000, 0); // 0.425M * $2 = $0.85

    expect(b.totalUsd).toBeCloseTo(BUDGET_DEGRADE_USD, 10);
    expect(b.shouldDegrade()).toBe(true);
    expect(b.shouldStop()).toBe(false);
  });

  it("does not degrade a hair under the threshold", () => {
    const b = new BudgetTracker();
    b.recordLlmCall("gather", "gemini-3.1-pro-preview", 424_000, 0); // $0.848

    expect(b.shouldDegrade()).toBe(false);
  });

  it("stops at exactly the cap", () => {
    const b = new BudgetTracker();
    b.recordLlmCall("gather", "gemini-3.1-pro-preview", 500_000, 0); // $1.00

    expect(b.totalUsd).toBeCloseTo(BUDGET_CAP_USD, 10);
    expect(b.shouldStop()).toBe(true);
    expect(b.shouldDegrade()).toBe(true);
  });

  it("stays stopped once overshot", () => {
    const b = new BudgetTracker();
    b.recordLlmCall("synthesize", "gemini-3.1-pro-preview", 5_000_000, 0); // $10

    expect(b.shouldStop()).toBe(true);
  });

  it("scales both thresholds to a custom cap, which is how a low balance shrinks a run", () => {
    const b = new BudgetTracker(0.2);

    b.recordLlmCall("gather", "gemini-3.1-pro-preview", 80_000, 0); // $0.16 = 80% of 0.2
    expect(b.shouldDegrade()).toBe(false);

    b.recordLlmCall("gather", "gemini-3.1-pro-preview", 5_000, 0); // +$0.01 → $0.17 = 85%
    expect(b.shouldDegrade()).toBe(true);
    expect(b.shouldStop()).toBe(false);

    b.recordLlmCall("gather", "gemini-3.1-pro-preview", 15_000, 0); // +$0.03 → $0.20
    expect(b.shouldStop()).toBe(true);
  });

  it("defaults to the PRD's $1 cap when the route passes no budget", () => {
    expect(new BudgetTracker().capUsd).toBe(BUDGET_CAP_USD);
    expect(new BudgetTracker(undefined).capUsd).toBe(BUDGET_CAP_USD);
  });

  it("keeps the degrade ratio and derived dollar figure in agreement", () => {
    expect(BUDGET_DEGRADE_RATIO).toBe(0.85);
    expect(BUDGET_DEGRADE_USD).toBeCloseTo(BUDGET_CAP_USD * 0.85, 10);
  });
});

describe("breakdown and summary", () => {
  it("hands out a copy, so a caller cannot mutate the ledger it is billing from", () => {
    const b = new BudgetTracker();
    b.recordLlmCall("plan", "gemini-3.1-flash-lite-preview", 100, 100);

    b.breakdown().push({ stage: "evil", kind: "llm", detail: "x", costUsd: 999 });

    expect(b.breakdown()).toHaveLength(1);
    expect(b.totalUsd).toBeLessThan(1);
  });

  it("renders a per-entry summary with the running total and the cap", () => {
    const b = new BudgetTracker(0.5);
    b.recordTavilyCredits("gather", 2, "advanced search");

    const summary = b.summary();
    expect(summary).toContain("[gather] search — advanced search — $0.0160");
    expect(summary).toContain("TOTAL: $0.0160 (cap: $0.50)");
  });

  it("summarises an empty run without dividing by zero", () => {
    expect(new BudgetTracker().summary()).toBe("  TOTAL: $0.0000 (cap: $1.00)");
  });
});

describe("what the tracker does NOT do", () => {
  /**
   * shouldStop() is a pre-flight check, not a spend limiter. A single call
   * recorded after the check can overshoot the cap without bound. Callers must
   * therefore check *before* every optional call — and `synthesizeStage`
   * currently does not. See pipeline.test.ts.
   */
  it("cannot prevent a single call from blowing past the cap", () => {
    const b = new BudgetTracker(1.0);
    expect(b.shouldStop()).toBe(false);

    b.recordLlmCall("synthesize", "gemini-3.1-pro-preview", 1_000_000, 1_000_000); // $14

    expect(b.totalUsd).toBeCloseTo(PRO_IN + PRO_OUT, 10);
    expect(b.totalUsd).toBeGreaterThan(b.capUsd);
  });
});
