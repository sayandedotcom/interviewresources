/**
 * The commercial and provider-cost assumptions used throughout the product.
 *
 * This module is deliberately client-safe: checkout product ids and credentials
 * belong in lib/packs.ts. Marketing, checkout, webhooks, metering, tests, and the
 * admin dashboard can all import the same prices and credit grants without
 * exposing server configuration.
 */
export const ECONOMICS_VERSION = "2026-07-26.v1";
export const USD_MICROS = 1_000_000;

export const ECONOMICS = {
  version: ECONOMICS_VERSION,
  providers: {
    gemini: {
      sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
      verifiedAt: "2026-07-26",
      /** Paid-tier USD per one million text tokens. */
      models: {
        "gemini-3.1-pro-preview": { input: 2, output: 12 },
        "gemini-3.5-flash": { input: 1.5, output: 9 },
        "gemini-3-flash-preview": { input: 0.5, output: 3 },
        "gemini-3.1-flash-lite": { input: 0.25, output: 1.5 },
      },
    },
    tavily: {
      sourceUrl: "https://docs.tavily.com/documentation/api-credits",
      verifiedAt: "2026-07-26",
      payAsYouGoUsdPerCredit: 0.008,
    },
    dodo: {
      sourceUrl: "https://dodopayments.com/de/pricing",
      verifiedAt: "2026-07-26",
      transactionPercentage: 0.04,
      transactionFixedUsd: 0.4,
      refundFeeUsd: 1,
      disputeFeeUsd: 30,
      /** Regular payouts are free at or above this threshold. */
      payoutFeeUsd: 5,
      payoutFeeBelowUsd: 1_000,
    },
  },
  credits: {
    usdPerCredit: 0.01,
    markup: 1.3,
  },
  margins: {
    baseFloor: 0.2,
    referredFloor: 0.05,
    blendedAlertFloor: 0.1,
  },
  referrals: {
    referrerRewardCredits: 100,
    refereeBonusCredits: 50,
    eligiblePacks: ["bundle", "max"] as const,
    firstPurchaseOnly: true,
    rewardCap: 10,
  },
  alerts: {
    failedRunSpendRatio: 0.1,
    staleProviderPriceDays: 45,
  },
  /** Operating costs are intentionally excluded from contribution margin. */
  monthlyFixedCostsUsd: 0,
} as const;

export type GeminiModel = keyof typeof ECONOMICS.providers.gemini.models;
export type PackSlug = "starter" | "bundle" | "max";

export interface CreditPackCatalogItem {
  slug: PackSlug;
  name: string;
  credits: number;
  priceUsdMinor: number;
}

export const CREDIT_PACK_CATALOG = [
  { slug: "starter", name: "Starter", credits: 100, priceUsdMinor: 149 },
  { slug: "bundle", name: "Bundle", credits: 550, priceUsdMinor: 649 },
  { slug: "max", name: "Max", credits: 1_200, priceUsdMinor: 1_249 },
] as const satisfies readonly CreditPackCatalogItem[];

export const CREDIT_PACKS_BY_SLUG = Object.fromEntries(
  CREDIT_PACK_CATALOG.map((pack) => [pack.slug, pack])
) as Record<PackSlug, (typeof CREDIT_PACK_CATALOG)[number]>;

export function getCatalogPack(slug: string): CreditPackCatalogItem | null {
  if (!Object.hasOwn(CREDIT_PACKS_BY_SLUG, slug)) return null;
  return CREDIT_PACKS_BY_SLUG[slug as PackSlug];
}

export function usdToMicros(usd: number): number {
  return Math.round(usd * USD_MICROS);
}

export function microsToUsd(micros: number): number {
  return micros / USD_MICROS;
}

export function estimateDodoTransactionFeeMicros(priceUsdMinor: number): number {
  return Math.round(
    priceUsdMinor * 10_000 * ECONOMICS.providers.dodo.transactionPercentage +
      usdToMicros(ECONOMICS.providers.dodo.transactionFixedUsd)
  );
}

export function creditLiabilityMicros(credits: number): number {
  return Math.round(
    ((credits * ECONOMICS.credits.usdPerCredit) / ECONOMICS.credits.markup) * USD_MICROS
  );
}

export interface PackEconomics {
  slug: PackSlug;
  referred: boolean;
  grossSalesMicros: number;
  estimatedDodoFeeMicros: number;
  netReceiptsMicros: number;
  apiLiabilityMicros: number;
  referralLiabilityMicros: number;
  contributionMicros: number;
  contributionMargin: number;
}

/** Worst-case pack economics when every granted credit is redeemed. */
export function getPackEconomics(slug: PackSlug, referred = false): PackEconomics {
  const pack = CREDIT_PACKS_BY_SLUG[slug];
  const grossSalesMicros = pack.priceUsdMinor * 10_000;
  const estimatedDodoFeeMicros = estimateDodoTransactionFeeMicros(pack.priceUsdMinor);
  const netReceiptsMicros = grossSalesMicros - estimatedDodoFeeMicros;
  const apiLiabilityMicros = creditLiabilityMicros(pack.credits);
  const referralCredits = referred
    ? ECONOMICS.referrals.referrerRewardCredits + ECONOMICS.referrals.refereeBonusCredits
    : 0;
  const referralLiabilityMicros = creditLiabilityMicros(referralCredits);
  const contributionMicros = netReceiptsMicros - apiLiabilityMicros - referralLiabilityMicros;

  return {
    slug,
    referred,
    grossSalesMicros,
    estimatedDodoFeeMicros,
    netReceiptsMicros,
    apiLiabilityMicros,
    referralLiabilityMicros,
    contributionMicros,
    contributionMargin: netReceiptsMicros > 0 ? contributionMicros / netReceiptsMicros : 0,
  };
}

export function providerPricesAreStale(
  now: Date = new Date(),
  staleAfterDays: number = ECONOMICS.alerts.staleProviderPriceDays
): boolean {
  const verified = Object.values(ECONOMICS.providers).map((provider) =>
    Date.parse(`${provider.verifiedAt}T00:00:00Z`)
  );
  const oldestVerification = Math.min(...verified);
  return now.getTime() - oldestVerification > staleAfterDays * 24 * 60 * 60 * 1_000;
}
