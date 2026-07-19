import { siteConfig } from "@/site";

export const webApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: siteConfig.name,
  description: siteConfig.description,
  url: siteConfig.url,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  url: siteConfig.url,
  sameAs: [siteConfig.links.twitter, siteConfig.links.github],
};

export const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: `How does ${siteConfig.name} work?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: "Paste a company (and optionally an interviewer). We research the company's product, stack, engineering culture, and reported interview loop, then pinpoint the questions you're likely to face, each citing the evidence it came from.",
      },
    },
    {
      "@type": "Question",
      name: "Do you scrape LinkedIn?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. An interviewer's name is only used as a public-search seed, never to scrape LinkedIn.",
      },
    },
  ],
};
