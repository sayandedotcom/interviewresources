/**
 * Enforces the PRD §7 cost contract: every research run must stay at or
 * under $1.00 in variable cost (LLM tokens + Tavily credits). Callers check
 * `shouldDegrade()` / `shouldStop()` between pipeline stages and skip
 * optional work (extra advanced searches, a second synthesis pass) once the
 * degrade threshold is crossed.
 */

// $/1M tokens. Model IDs match the @ai-sdk/google GoogleModelId union.
// Keep in sync with PRD §7 — verify against current pricing before relying
// on this for real budgeting decisions.
const GEMINI_PRICES = {
  "gemini-3.1-pro-preview": { input: 2.0, output: 12.0 },
  "gemini-3.5-flash": { input: 1.5, output: 9.0 },
  "gemini-3-flash-preview": { input: 0.5, output: 3.0 },
  "gemini-3.1-flash-lite-preview": { input: 0.25, output: 1.5 },
} as const;

export type GeminiModel = keyof typeof GEMINI_PRICES;

// Tavily credits: basic search = 1 credit, advanced = 2, extract = 1 per 5 URLs.
const TAVILY_CREDIT_COST_USD = 0.008;

export const BUDGET_CAP_USD = 1.0;
export const BUDGET_DEGRADE_USD = 0.85;

export interface CostEntry {
  stage: string;
  kind: "llm" | "search";
  detail: string;
  costUsd: number;
}

export class BudgetTracker {
  private entries: CostEntry[] = [];

  recordLlmCall(stage: string, model: GeminiModel, inputTokens: number, outputTokens: number): number {
    const price = GEMINI_PRICES[model];
    const costUsd = (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
    this.entries.push({
      stage,
      kind: "llm",
      detail: `${model} (${inputTokens}in/${outputTokens}out)`,
      costUsd,
    });
    return costUsd;
  }

  recordTavilyCredits(stage: string, credits: number, detail: string): number {
    const costUsd = credits * TAVILY_CREDIT_COST_USD;
    this.entries.push({ stage, kind: "search", detail, costUsd });
    return costUsd;
  }

  get totalUsd(): number {
    return this.entries.reduce((sum, e) => sum + e.costUsd, 0);
  }

  shouldDegrade(): boolean {
    return this.totalUsd >= BUDGET_DEGRADE_USD;
  }

  shouldStop(): boolean {
    return this.totalUsd >= BUDGET_CAP_USD;
  }

  breakdown(): CostEntry[] {
    return [...this.entries];
  }

  summary(): string {
    const lines = this.entries.map(
      (e) => `  [${e.stage}] ${e.kind} — ${e.detail} — $${e.costUsd.toFixed(4)}`,
    );
    lines.push(`  TOTAL: $${this.totalUsd.toFixed(4)} (cap: $${BUDGET_CAP_USD.toFixed(2)})`);
    return lines.join("\n");
  }
}
