import { pricingConfig } from "./config/pricing";
import { testimonialsConfig } from "./config/testimonials";
import { faqsConfig } from "./config/faqs";
import { ctaConfig } from "./config/cta";

export const siteConfig = {
  name: "Scouting Report",
  description: "Get the interview questions before they ask them.",
  url: "https://interviewquestions.ai",
  email: "[EMAIL_ADDRESS]",
  links: {
    twitter: "https://twitter.com/sayandedotcom",
    github: "https://github.com/sayandedotcom/interview-questions",
  },
  waitlist: false,
  activeAuth: false,
  enablePayments: false,
  keywords: [
    "interview questions",
    "interview prep",
    "company research",
    "technical interview",
    "job interview",
  ],
  pricingPlans: pricingConfig.plans,
  testimonials: testimonialsConfig,
  faqs: faqsConfig,
  cta: ctaConfig,
};
