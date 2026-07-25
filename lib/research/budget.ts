/**
 * Enforces the PRD §7 cost contract: every research run must stay at or
 * under $1.00 in variable cost (LLM tokens + Tavily credits). Callers check
 * `shouldDegrade()` / `shouldStop()` between pipeline stages and skip
 * optional work (extra advanced searches, a second synthesis pass) once the
 * degrade threshold is crossed.
 */
import { ECONOMICS, type GeminiModel, USD_MICROS, microsToUsd, usdToMicros } from "../economics";

export const GEMINI_PRICES = ECONOMICS.providers.gemini.models;
export type { GeminiModel };
export const TAVILY_CREDIT_COST_USD = ECONOMICS.providers.tavily.payAsYouGoUsdPerCredit;

export const BUDGET_CAP_USD = 1.0;
/** Degrade once 85% of the run's cap is spent. */
export const BUDGET_DEGRADE_RATIO = 0.85;
export const BUDGET_DEGRADE_USD = BUDGET_CAP_USD * BUDGET_DEGRADE_RATIO;

export const EFFORT_LEVELS = ["low", "medium", "high"] as const;
export type Effort = (typeof EFFORT_LEVELS)[number];

export interface EffortPreset {
  /** Ceiling on the run's metered spend, before the balance clamps it further. */
  capUsd: number;
  /** Query-count range handed to the plan-stage prompt. */
  queriesHint: string;
  /** Results requested per Tavily search. */
  searchResults: number;
  /** How many top URLs get their full page extracted. */
  extractLimit: number;
  /** Query-count range for the proxy wave when direct evidence is sparse. */
  proxyQueriesHint: string;
  /** Full-page extracts allowed in the proxy wave — kept small; proxy pages are context, not primary evidence. */
  proxyExtractLimit: number;
  /** Question-count range handed to the synthesize prompt. */
  questionTarget: string;
  /** Hard ceiling on importantLinks, and the range shown to the model. */
  linksMax: number;
  linksHint: string;
  /** Curated Research library size. Never padded when discovery returns fewer links. */
  resourcesMin: number;
  resourcesMax: number;
  /** Maximum metadata-only candidates exposed to synthesis. */
  resourceCatalogMax: number;
  /** Hard provider ceiling; the budget can lower it further at runtime. */
  synthesisMaxOutputTokens: number;
  label: string;
  blurb: string;
}

/**
 * The one place output volume and spend are tuned together. Raising question or
 * link counts without raising capUsd just starves the synthesize call; raising
 * capUsd alone buys evidence the prompt then refuses to use. Medium reproduces
 * the pre-effort behaviour exactly, so old reports and tests stay honest.
 */
export const EFFORT_PRESETS: Record<Effort, EffortPreset> = {
  low: {
    capUsd: 0.5,
    queriesHint: "3-5",
    searchResults: 4,
    extractLimit: 3,
    proxyQueriesHint: "2-3",
    proxyExtractLimit: 1,
    questionTarget: "8-15",
    linksMax: 4,
    linksHint: "2-4",
    resourcesMin: 8,
    resourcesMax: 12,
    resourceCatalogMax: 30,
    synthesisMaxOutputTokens: 6_000,
    label: "Low",
    blurb: "Quick scan — fewer searches, the essentials only",
  },
  medium: {
    capUsd: BUDGET_CAP_USD,
    queriesHint: "4-8",
    searchResults: 5,
    extractLimit: 5,
    proxyQueriesHint: "3-5",
    proxyExtractLimit: 2,
    questionTarget: "15-30",
    linksMax: 6,
    linksHint: "3-6",
    resourcesMin: 12,
    resourcesMax: 16,
    resourceCatalogMax: 35,
    synthesisMaxOutputTokens: 9_000,
    label: "Medium",
    blurb: "Balanced — the default depth",
  },
  high: {
    capUsd: 2.0,
    queriesHint: "8-12",
    searchResults: 8,
    extractLimit: 8,
    proxyQueriesHint: "5-8",
    proxyExtractLimit: 3,
    questionTarget: "30-50",
    linksMax: 10,
    linksHint: "6-10",
    resourcesMin: 16,
    resourcesMax: 20,
    resourceCatalogMax: 40,
    synthesisMaxOutputTokens: 14_000,
    label: "High",
    blurb: "Exhaustive — widest search, most questions",
  },
};

/** The costliest effort, which sets the advisory ceiling shown in the UI. */
export const MAX_EFFORT_CAP_USD = Math.max(...EFFORT_LEVELS.map((e) => EFFORT_PRESETS[e].capUsd));

/**
 * The most links any effort can produce. Extensions don't know the effort the
 * original report ran at, so they merge up to this ceiling rather than clipping
 * a high-effort report's links down to a lower effort's cap.
 */
export const MAX_EFFORT_LINKS = Math.max(...EFFORT_LEVELS.map((e) => EFFORT_PRESETS[e].linksMax));
export const MAX_EFFORT_RESOURCES = Math.max(
  ...EFFORT_LEVELS.map((e) => EFFORT_PRESETS[e].resourcesMax)
);

export interface CostEntry {
  stage: string;
  kind: "llm" | "search";
  detail: string;
  costMicros: number;
  costUsd: number;
}

export interface BudgetReservation {
  id: number;
  stage: string;
  kind: CostEntry["kind"];
  detail: string;
  maximumMicros: number;
}

export class BudgetExceededError extends Error {
  constructor(message = "The run has no provider budget left for this call.") {
    super(message);
    this.name = "BudgetExceededError";
  }
}

export class BudgetTracker {
  private entries: CostEntry[] = [];
  private reservations = new Map<number, BudgetReservation>();
  private nextReservationId = 1;
  private readonly capMicros: number;
  private readonly synthesisReserveMicros: number;

  /**
   * `capUsd` defaults to the PRD's $1 ceiling, but a run is also capped by what
   * the user's credit balance can actually pay for — the route passes the
   * smaller of the two so a run can never cost more than the user can afford.
   */
  constructor(readonly capUsd: number = BUDGET_CAP_USD) {
    this.capMicros = usdToMicros(capUsd);
    // Keep enough room for the expensive final call while allowing a small
    // balance to spend proportionally on evidence gathering.
    this.synthesisReserveMicros = Math.min(180_000, Math.floor(this.capMicros * 0.45));
  }

  private get committedMicros(): number {
    return this.entries.reduce((sum, entry) => sum + entry.costMicros, 0);
  }

  private get reservedMicros(): number {
    return [...this.reservations.values()].reduce(
      (sum, reservation) => sum + reservation.maximumMicros,
      0
    );
  }

  private reservableMicros(stage: string): number {
    const protectedMicros = stage === "synthesize" ? 0 : this.synthesisReserveMicros;
    return Math.max(
      0,
      this.capMicros - protectedMicros - this.committedMicros - this.reservedMicros
    );
  }

  private reserve(
    stage: string,
    kind: CostEntry["kind"],
    detail: string,
    maximumMicros: number
  ): BudgetReservation | null {
    if (maximumMicros <= 0 || maximumMicros > this.reservableMicros(stage)) return null;
    const reservation = {
      id: this.nextReservationId++,
      stage,
      kind,
      detail,
      maximumMicros,
    };
    this.reservations.set(reservation.id, reservation);
    return reservation;
  }

  private commit(reservation: BudgetReservation, costMicros: number, detail: string): number {
    const active = this.reservations.get(reservation.id);
    if (!active) throw new Error("Provider budget reservation is no longer active.");
    if (costMicros > active.maximumMicros) {
      this.reservations.delete(reservation.id);
      throw new BudgetExceededError(
        `Provider charge exceeded its reservation (${costMicros} > ${active.maximumMicros} micro-USD).`
      );
    }
    this.reservations.delete(reservation.id);
    this.entries.push({
      stage: active.stage,
      kind: active.kind,
      detail,
      costMicros,
      costUsd: microsToUsd(costMicros),
    });
    return microsToUsd(costMicros);
  }

  cancelReservation(reservation: BudgetReservation): void {
    this.reservations.delete(reservation.id);
  }

  /**
   * Reserves a worst-case token charge before a call is dispatched. The byte
   * count is a conservative input-token ceiling and includes headroom for the
   * structured-output schema added by the AI SDK.
   */
  reserveLlmCall(opts: {
    stage: string;
    model: GeminiModel;
    promptBytes: number;
    requestedMaxOutputTokens: number;
  }): { reservation: BudgetReservation; maxOutputTokens: number } {
    const price = GEMINI_PRICES[opts.model];
    const maxInputTokens = opts.promptBytes + 16_000;
    const inputMicros = Math.ceil((maxInputTokens * price.input * USD_MICROS) / 1_000_000);
    const availableMicros = this.reservableMicros(opts.stage);
    const outputBudgetMicros = availableMicros - inputMicros;
    const affordableOutputTokens = Math.floor(
      (outputBudgetMicros * 1_000_000) / (price.output * USD_MICROS)
    );
    const maxOutputTokens = Math.min(opts.requestedMaxOutputTokens, affordableOutputTokens);
    if (maxOutputTokens < 256) throw new BudgetExceededError();

    const maximumMicros =
      inputMicros + Math.ceil((maxOutputTokens * price.output * USD_MICROS) / 1_000_000);
    const reservation = this.reserve(
      opts.stage,
      "llm",
      `${opts.model} (reserved ${maxInputTokens}in/${maxOutputTokens}out)`,
      maximumMicros
    );
    if (!reservation) throw new BudgetExceededError();
    return { reservation, maxOutputTokens };
  }

  commitLlmCall(
    reservation: BudgetReservation,
    model: GeminiModel,
    inputTokens: number,
    outputTokens: number
  ): number {
    const price = GEMINI_PRICES[model];
    const costMicros = Math.ceil(
      ((inputTokens * price.input + outputTokens * price.output) / 1_000_000) * USD_MICROS
    );
    return this.commit(reservation, costMicros, `${model} (${inputTokens}in/${outputTokens}out)`);
  }

  reserveTavilyCredits(stage: string, credits: number, detail: string): BudgetReservation | null {
    return this.reserve(stage, "search", detail, usdToMicros(credits * TAVILY_CREDIT_COST_USD));
  }

  commitTavilyCredits(reservation: BudgetReservation, credits: number, detail: string): number {
    return this.commit(reservation, usdToMicros(credits * TAVILY_CREDIT_COST_USD), detail);
  }

  recordLlmCall(
    stage: string,
    model: GeminiModel,
    inputTokens: number,
    outputTokens: number
  ): number {
    const price = GEMINI_PRICES[model];
    const costMicros = Math.ceil(
      ((inputTokens * price.input + outputTokens * price.output) / 1_000_000) * USD_MICROS
    );
    const costUsd = microsToUsd(costMicros);
    this.entries.push({
      stage,
      kind: "llm",
      detail: `${model} (${inputTokens}in/${outputTokens}out)`,
      costMicros,
      costUsd,
    });
    return costUsd;
  }

  recordTavilyCredits(stage: string, credits: number, detail: string): number {
    const costMicros = usdToMicros(credits * TAVILY_CREDIT_COST_USD);
    const costUsd = microsToUsd(costMicros);
    this.entries.push({ stage, kind: "search", detail, costMicros, costUsd });
    return costUsd;
  }

  get totalUsd(): number {
    return microsToUsd(this.totalMicros);
  }

  get totalMicros(): number {
    return this.committedMicros;
  }

  shouldDegrade(): boolean {
    return this.committedMicros + this.reservedMicros >= this.capMicros * BUDGET_DEGRADE_RATIO;
  }

  shouldStop(): boolean {
    return this.reservableMicros("non_synthesis") <= 0;
  }

  breakdown(): CostEntry[] {
    return [...this.entries];
  }

  summary(): string {
    const lines = this.entries.map(
      (e) => `  [${e.stage}] ${e.kind} — ${e.detail} — $${e.costUsd.toFixed(4)}`
    );
    lines.push(`  TOTAL: $${this.totalUsd.toFixed(4)} (cap: $${this.capUsd.toFixed(2)})`);
    return lines.join("\n");
  }
}
