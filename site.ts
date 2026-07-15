import { brandConfig } from "./config/brand";
import { companiesConfig } from "./config/companies";
import { comparisonConfig } from "./config/comparison";
import { contactConfig } from "./config/contact";
import { copyConfig } from "./config/copy";
import { keywordsConfig } from "./config/keywords";
import { pricingConfig } from "./config/pricing";

export const siteConfig = {
  name: "Interview Scout",
  description:
    "AI predicts the interview questions you'll face — under $0.50 a report, every question backed by evidence.",
  url: "https://interviewscout.app",
  /** Shown in the landing page hero badge, e.g. "34,345 users". Edit freely. */
  userCount: "2,345",
  emails: contactConfig,
  links: {
    twitter: "https://twitter.com/sayandedotcom",
    github: "https://github.com/sayandedotcom/interview-questions",
  },
  waitlist: false,
  activeAuth: true,
  enablePayments: true,
  keywords: keywordsConfig.keywords,
  copy: copyConfig,
  brand: brandConfig,
  pricingPlans: pricingConfig.plans,
  faqs: copyConfig.faqs,
  cta: copyConfig.cta,
  stats: copyConfig.landing.stats,
  companies: companiesConfig,
  comparison: comparisonConfig,
};
