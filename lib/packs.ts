import { env } from "@/env";

import {
  CREDIT_PACKS_BY_SLUG,
  CREDIT_PACK_CATALOG,
  type CreditPackCatalogItem,
  type PackSlug,
  getCatalogPack,
} from "./economics";

export interface CreditPack extends CreditPackCatalogItem {
  productId: string | undefined;
  isLegacyProduct?: boolean;
}

const ACTIVE_PRODUCT_IDS: Record<PackSlug, string | undefined> = {
  starter: env.DODO_PRODUCT_ID_STARTER,
  bundle: env.DODO_PRODUCT_ID_BUNDLE,
  max: env.DODO_PRODUCT_ID_MAX,
};

const LEGACY_PRODUCT_IDS: Record<PackSlug, string[]> = {
  starter:
    env.DODO_LEGACY_PRODUCT_IDS_STARTER?.split(",")
      .map((id) => id.trim())
      .filter(Boolean) ?? [],
  bundle:
    env.DODO_LEGACY_PRODUCT_IDS_BUNDLE?.split(",")
      .map((id) => id.trim())
      .filter(Boolean) ?? [],
  max:
    env.DODO_LEGACY_PRODUCT_IDS_MAX?.split(",")
      .map((id) => id.trim())
      .filter(Boolean) ?? [],
};

const LEGACY_PRICE_USD_MINOR: Record<PackSlug, number> = {
  starter: 100,
  bundle: 500,
  max: 1_000,
};

export const CREDIT_PACKS = Object.fromEntries(
  CREDIT_PACK_CATALOG.map((pack) => [
    pack.slug,
    { ...pack, productId: ACTIVE_PRODUCT_IDS[pack.slug] },
  ])
) as Record<PackSlug, CreditPack>;

export function getPack(slug: string): CreditPack | null {
  const pack = getCatalogPack(slug);
  return pack ? CREDIT_PACKS[pack.slug] : null;
}

/**
 * Reverse lookup for the webhook. Checkout only uses active ids; legacy ids
 * remain accepted so delayed provider deliveries keep their original USD price
 * snapshot while granting the unchanged credits.
 */
export function getPackByProductId(productId: string): CreditPack | null {
  const active = Object.values(CREDIT_PACKS).find((pack) => pack.productId === productId);
  if (active) return active;

  for (const slug of Object.keys(CREDIT_PACKS_BY_SLUG) as PackSlug[]) {
    if (LEGACY_PRODUCT_IDS[slug].includes(productId)) {
      return {
        ...CREDIT_PACKS_BY_SLUG[slug],
        priceUsdMinor: LEGACY_PRICE_USD_MINOR[slug],
        productId,
        isLegacyProduct: true,
      };
    }
  }
  return null;
}
