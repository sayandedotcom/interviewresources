import { brandConfig } from "./config/brand";
import { companiesConfig } from "./config/companies";
import { comparisonConfig } from "./config/comparison";
import { contactConfig } from "./config/contact";
import { copyConfig } from "./config/copy";
import { ctaConfig } from "./config/cta";
import { faqsConfig } from "./config/faqs";
import { pricingConfig } from "./config/pricing";
import { statsConfig } from "./config/stats";
import { testimonialsConfig } from "./config/testimonials";

export const siteConfig = {
  name: "Scouting Report",
  description: "Get the interview questions before they ask them.",
  url: "https://interviewquestions.ai",
  emails: contactConfig,
  links: {
    twitter: "https://twitter.com/sayandedotcom",
    github: "https://github.com/sayandedotcom/interview-questions",
  },
  waitlist: false,
  activeAuth: true,
  enablePayments: true,
  keywords: [
    "interview questions",
    "interview prep",
    "company research",
    "technical interview",
    "job interview",
  ],
  copy: copyConfig,
  brand: brandConfig,
  pricingPlans: pricingConfig.plans,
  testimonials: testimonialsConfig,
  faqs: faqsConfig,
  cta: ctaConfig,
  stats: statsConfig,
  companies: companiesConfig,
  comparison: comparisonConfig,
};
