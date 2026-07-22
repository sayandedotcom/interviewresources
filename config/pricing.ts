/**
 * Presentational only — imported by client pages. The Dodo product ids and the
 * credit amounts that actually get granted live in lib/packs.ts (server-only).
 * Keep `credits` here in sync with CREDIT_PACKS.
 *
 * Both packs unlock the same product; they differ only in how many credits you
 * get. A report is metered at its real cost, so counts are approximate: a
 * typical run is ~46 credits and the pipeline hard-caps at 130.
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
  plans: [
    {
      slug: "starter" as const,
      name: "Starter",
      badge: "Try it",
      featured: false,
      price: 1,
      credits: 100,
      description: "Try it for $1 — about two reports",
      features: [
        "100 credits",
        "About 2 research reports",
        "Pinpointed questions with evidence",
        "Interviewer research",
        "PDF and JSON export",
      ],
    },
    {
      slug: "bundle" as const,
      name: "Bundle",
      badge: "Most popular",
      featured: true,
      price: 5,
      credits: 550,
      description: "Stock up, stop topping up",
      features: [
        "550 credits",
        "About 11 research reports",
        "Everything in Starter",
        "10% bonus credits — 500 paid, 550 granted",
      ],
    },
    {
      slug: "max" as const,
      name: "Max",
      badge: "Best value",
      featured: false,
      price: 10,
      credits: 1200,
      description: "For a full interview season",
      features: [
        "1200 credits",
        "About 26 research reports",
        "Everything in Bundle",
        "20% bonus credits — 1000 paid, 1200 granted",
      ],
    },
  ],
};
