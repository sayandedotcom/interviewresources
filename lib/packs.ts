/**
 * Server-only mapping from a plan slug to its Dodo product and what it grants.
 * Kept out of config/pricing.ts because that file is imported by client pages
 * and these product ids come from the environment.
 */
import { env } from "@/env";

export interface CreditPack {
  slug: "basic" | "pro";
  name: string;
  credits: number;
  tier: "free" | "pro";
  productId: string | undefined;
}

export const CREDIT_PACKS: Record<CreditPack["slug"], CreditPack> = {
  basic: {
    slug: "basic",
    name: "Basic",
    credits: 100,
    tier: "free",
    productId: env.DODO_PRODUCT_ID_BASIC,
  },
  pro: {
    slug: "pro",
    name: "Pro",
    credits: 500,
    tier: "pro",
    productId: env.DODO_PRODUCT_ID_PRO,
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
