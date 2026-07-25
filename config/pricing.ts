import { CREDIT_PACK_CATALOG, type PackSlug } from "@/lib/economics";

/**
 * Presentational details for the shared, client-safe pack catalog. Dodo product
 * ids remain server-only in lib/packs.ts.
 *
 * Prices are USD only. Dodo's Adaptive Currency converts them at the checkout
 * page from the customer's billing address, so an Indian buyer is charged in
 * rupees having just read a dollar figure here. `currencyNote` is what keeps
 * that from reading as a bait-and-switch. If Adaptive Currency is ever switched
 * off in the Dodo dashboard, drop the note too — it would then be a lie.
 */
export const pricingConfig = {
  /** Shown under the pack cards. See the note on Adaptive Currency above. */
  currencyNote: "Prices in USD. You'll be charged in your local currency at checkout.",
  plans: CREDIT_PACK_CATALOG.map((pack) => {
    const presentation: Record<
      PackSlug,
      {
        badge: string;
        featured: boolean;
        description: string;
        features: string[];
      }
    > = {
      starter: {
        badge: "Try it",
        featured: false,
        description: "A low-risk first look",
        features: [
          "100 credits",
          "About 5 research reports",
          "Pinpointed questions with evidence",
          "Interviewer research",
          "PDF and JSON export",
        ],
      },
      bundle: {
        badge: "Most popular",
        featured: true,
        description: "Stock up, stop topping up",
        features: [
          "550 credits",
          "About 25 research reports",
          "Everything in Starter",
          "50 bonus credits",
        ],
      },
      max: {
        badge: "Best value",
        featured: false,
        description: "For a full interview season",
        features: [
          "1200 credits",
          "About 50 research reports",
          "Everything in Bundle",
          "200 bonus credits",
        ],
      },
    };

    return {
      ...pack,
      price: pack.priceUsdMinor / 100,
      ...presentation[pack.slug],
    };
  }),
};
