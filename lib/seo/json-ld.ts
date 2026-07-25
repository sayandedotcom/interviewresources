import { siteConfig } from "@/site";

import { type PublicRoute, publicRoutes } from "./routes";

const planPrices = siteConfig.pricingPlans.map((plan) => plan.price);

/**
 * Stable node identifiers. Without them each block declares an unrelated
 * `Organization`/`Person`, and a consumer has no way to tell that the founder
 * named on /about is the same entity as the one referenced by the site-wide
 * `Organization`. With them, every later block can `@id`-reference these
 * instead of restating (and risking contradicting) their properties.
 */
const organizationId = `${siteConfig.url}/#organization`;
const founderId = `${siteConfig.url}/#founder`;

const absolute = (path: string) => new URL(path, siteConfig.url).toString();

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

/**
 * The founder as a first-class node. A named, verifiable human is the cheapest
 * authority signal a solo product has, and `/about` says the same thing in
 * prose — the two must not disagree, so both read `founderNote` from config.
 */
export const founderJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": founderId,
  name: siteConfig.copy.founderNote.name,
  jobTitle: siteConfig.copy.founderNote.role,
  url: absolute("/about"),
  sameAs: [siteConfig.links.twitter, siteConfig.links.github],
};

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": organizationId,
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  /** Real file in /public — verified present, not a placeholder path. */
  logo: absolute("/logo.png"),
  founder: { "@id": founderId },
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: siteConfig.emails.support,
      url: absolute("/contact"),
      availableLanguage: "English",
    },
    {
      "@type": "ContactPoint",
      contactType: "security",
      email: siteConfig.emails.security,
      url: absolute("/security"),
      availableLanguage: "English",
    },
  ],
  sameAs: [siteConfig.links.twitter, siteConfig.links.github],
};

/**
 * Home > Page. The site is flat, so every crumb is two levels — which is
 * exactly the shape Google needs to replace the raw URL in a result snippet.
 * Names come from `publicRoutes` so a new page can't ship without one.
 */
export function breadcrumbJsonLd(path: Exclude<PublicRoute, "/">) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: publicRoutes["/"].label,
        item: siteConfig.url,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: publicRoutes[path].label,
        item: absolute(path),
      },
    ],
  };
}

/**
 * `/about`, tied to the founder and the org rather than restating either.
 */
export const aboutPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": `${absolute("/about")}#about`,
  url: absolute("/about"),
  name: `About ${siteConfig.name}`,
  about: { "@id": organizationId },
  mainEntity: { "@id": organizationId },
  publisher: { "@id": organizationId },
};

export const contactPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "@id": `${absolute("/contact")}#contact`,
  url: absolute("/contact"),
  name: `Contact ${siteConfig.name}`,
  mainEntity: { "@id": organizationId },
};

/**
 * Per-plan `Offer`s for /pricing. The site-wide `WebApplication` carries an
 * `AggregateOffer` (a range), which can't attribute a price to a named pack.
 * Both are derived from `siteConfig.pricingPlans`, so they cannot contradict
 * each other or the prices rendered on the page.
 */
export const pricingOffersJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteConfig.name,
  url: absolute("/pricing"),
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any",
  publisher: { "@id": organizationId },
  offers: siteConfig.pricingPlans.map((plan) => ({
    "@type": "Offer",
    name: plan.name,
    price: String(plan.price),
    priceCurrency: "USD",
    description: `${plan.credits} credits — ${plan.description}`,
    url: absolute("/pricing"),
    availability: "https://schema.org/InStock",
  })),
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

/**
 * Same contract as `faqJsonLd`, for the help centre's operational Q&A. The two
 * sets are disjoint by design (see `copy.helpFaqs`), so this is not a duplicate
 * of the landing page's block.
 */
export const helpFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${absolute("/help")}#faq`,
  mainEntity: siteConfig.copy.helpFaqs.flatMap((group) =>
    group.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    }))
  ),
};
