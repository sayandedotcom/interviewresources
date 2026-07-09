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
  return CREDIT_PACKS[slug as CreditPack["slug"]] ?? null;
}

/** Reverse lookup for the webhook, which only sees Dodo product ids. */
export function getPackByProductId(productId: string): CreditPack | null {
  return Object.values(CREDIT_PACKS).find((p) => p.productId === productId) ?? null;
}
