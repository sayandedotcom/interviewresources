/**
 * Presentational only — imported by client pages. The Dodo product ids and the
 * credit amounts that actually get granted live in lib/packs.ts (server-only).
 * Keep `credits` here in sync with CREDIT_PACKS.
 *
 * A report is metered at its real cost, so counts are approximate: a typical
 * run is ~46 credits and the pipeline hard-caps at 130.
 */
export const pricingConfig = {
  plans: [
    {
      slug: "basic" as const,
      name: "Basic",
      price: 1,
      credits: 100,
      description: "Perfect for occasional prep",
      features: [
        "100 credits",
        "About 2 research reports",
        "Question predictions with evidence",
        "Email support",
      ],
    },
    {
      slug: "pro" as const,
      name: "Pro",
      price: 5,
      credits: 500,
      description: "For serious candidates",
      features: [
        "500 credits",
        "About 10 research reports",
        "Interviewer research",
        "Export reports",
        "Priority support",
      ],
    },
  ],
};
