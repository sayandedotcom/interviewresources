/**
 * Server-only mapping from a pack slug to its Dodo product and what it grants.
 * Kept out of config/pricing.ts because that file is imported by client pages
 * and these product ids come from the environment.
 */
import { env } from "@/env";

export interface CreditPack {
  slug: "starter" | "bundle" | "max";
  name: string;
  credits: number;
  priceUsdMinor: number;
  productId: string | undefined;
}

/**
 * Starter grants a flat 100 credits per dollar. The bigger packs add a bonus on
 * top of that rate: Bundle 10%, Max 20%.
 */
export const CREDIT_PACKS: Record<CreditPack["slug"], CreditPack> = {
  starter: {
    slug: "starter",
    name: "Starter",
    credits: 100,
    priceUsdMinor: 100,
    productId: env.DODO_PRODUCT_ID_STARTER,
  },
  bundle: {
    slug: "bundle",
    name: "Bundle",
    credits: 550,
    priceUsdMinor: 500,
    productId: env.DODO_PRODUCT_ID_BUNDLE,
  },
  max: {
    slug: "max",
    name: "Max",
    credits: 1200,
    priceUsdMinor: 1000,
    productId: env.DODO_PRODUCT_ID_MAX,
  },
};

export function getPack(slug: string): CreditPack | null {
  // hasOwn, not a bare index: the checkout route passes `String(body.plan)`
  // straight in, and `CREDIT_PACKS["constructor"]` resolves off the prototype
  // to a truthy value that would sail past the caller's `if (!pack)` guard.
  if (!Object.hasOwn(CREDIT_PACKS, slug)) return null;
  return CREDIT_PACKS[slug as CreditPack["slug"]];
}

/** Reverse lookup for the webhook, which only sees Dodo product ids. */
export function getPackByProductId(productId: string): CreditPack | null {
  return Object.values(CREDIT_PACKS).find((p) => p.productId === productId) ?? null;
}
