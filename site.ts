import { brandConfig } from "./config/brand";
import { companiesConfig } from "./config/companies";
import { comparisonConfig } from "./config/comparison";
import { contactConfig } from "./config/contact";
import { copyConfig } from "./config/copy";
import { keywordsConfig } from "./config/keywords";
import { pricingConfig } from "./config/pricing";

export const siteConfig = {
  name: "Interview Resources",
  description:
    "AI gathers the interview resources you'll need — under $0.50 a report, every question backed by evidence.",
  /**
   * The www host, not the apex: Vercel 308s the apex here, so the apex form
   * would put a redirect hop in every canonical link, OG url, and sitemap
   * entry. Must stay in step with NEXT_PUBLIC_SITE_URL. Not the same as the
   * email domain in config/contact.ts, which is correctly apex-only.
   */
  url: "https://www.interviewresources.app",
  /** Shown in the landing page hero badge, e.g. "34,345 users". Edit freely. */
  userCount: "2,345",
  emails: contactConfig,
  links: {
    twitter: "https://x.com/sayandedotcom",
    github: "https://github.com/sayandedotcom/interview-questions",
  },
  waitlist: false,
  activeAuth: true,
  enablePayments: true,
  keywords: keywordsConfig.keywords,
  copy: copyConfig,
  brand: brandConfig,
  pricingPlans: pricingConfig.plans,
  pricingNote: pricingConfig.currencyNote,
  faqs: copyConfig.faqs,
  cta: copyConfig.cta,
  stats: copyConfig.landing.stats,
  companies: companiesConfig,
  comparison: comparisonConfig,
};
