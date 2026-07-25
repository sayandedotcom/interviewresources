import { CREDIT_PACKS_BY_SLUG } from "@/lib/economics";

const STARTER_PRICE = `$${(CREDIT_PACKS_BY_SLUG.starter.priceUsdMinor / 100).toFixed(2)}`;

export const comparisonConfig = [
  {
    feature: "Company-specific questions",
    us: true,
    genericPrep: false,
    coaching: "Sometimes",
  },
  {
    feature: "Evidence-backed questions",
    us: true,
    genericPrep: false,
    coaching: "Sometimes",
  },
  {
    feature: "Live research process",
    us: true,
    genericPrep: false,
    coaching: false,
  },
  {
    feature: "Interviewer targeting",
    us: true,
    genericPrep: false,
    coaching: "Expensive add-on",
  },
  {
    feature: "Prep time per company",
    us: "3 minutes",
    genericPrep: "Hours",
    coaching: "Multiple sessions",
  },
  {
    feature: "Starting price",
    us: `${STARTER_PRICE} (≈2 reports)`,
    genericPrep: "Free",
    coaching: "$200+",
  },
];
