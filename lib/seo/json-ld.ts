import { siteConfig } from "@/site";

const planPrices = siteConfig.pricingPlans.map((plan) => plan.price);

export const webApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: siteConfig.name,
  description: siteConfig.description,
  url: siteConfig.url,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any",
  /**
   * Derived from the real credit packs rather than hardcoded. A fixed
   * `price: "0"` here would contradict the prices shown on /pricing, which
   * Google treats as a structured-data mismatch.
   */
  offers: {
    "@type": "AggregateOffer",
    lowPrice: String(Math.min(...planPrices)),
    highPrice: String(Math.max(...planPrices)),
    priceCurrency: "USD",
    offerCount: String(siteConfig.pricingPlans.length),
  },
};

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  url: siteConfig.url,
  sameAs: [siteConfig.links.twitter, siteConfig.links.github],
};

/**
 * Built from the same `siteConfig.faqs` that `FaqSection` renders, so the
 * markup can never drift from the visible copy — Google requires FAQ
 * structured data to match what's on the page.
 *
 * Render this on the landing page only, never in the root layout: the FAQs
 * are only visible there.
 */
export const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: siteConfig.faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};
