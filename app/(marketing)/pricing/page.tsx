import Link from "next/link";

import { siteConfig } from "@/site";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { BreadcrumbJsonLd, JsonLd } from "@/components/json-ld";
import { PricingSection } from "@/components/sections/pricing-section";
import { Section } from "@/components/sections/section";

import { pricingOffersJsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  path: "/pricing",
  title: "Pricing",
  description:
    "Buy credits once and spend them only when you run a report. A typical report is under $0.50 — no subscription, no monthly fee.",
});

export default function PricingPage() {
  const { pricingPage } = siteConfig.copy;

  return (
    <main className="flex flex-1 flex-col">
      <BreadcrumbJsonLd path="/pricing" />
      <JsonLd data={pricingOffersJsonLd} />
      <Header />

      {/* The page is about pricing, so this heading is its h1 — and it passes
          its own copy so it doesn't duplicate the landing page's block. */}
      <PricingSection as="h1" copy={pricingPage} />

      {/* The depth that makes this page worth ranking over the landing page's
          pricing section rather than against it. */}
      <Section tone="tint">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {pricingPage.details.title}
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {pricingPage.details.items.map((item) => (
            <div key={item.title} className="silver-edge bg-background rounded-2xl p-6 sm:p-8">
              <h3 className="font-display text-lg font-semibold tracking-tight">{item.title}</h3>
              <p className="font-display text-muted-foreground mt-2 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
        <p className="font-display text-muted-foreground mt-8 text-sm leading-relaxed">
          {siteConfig.pricingNote} For how the research is done and what the agent will and will not
          treat as evidence, see{" "}
          <Link href="/about" className="text-primary hover:underline">
            about
          </Link>{" "}
          or the{" "}
          <Link href="/help" className="text-primary hover:underline">
            help centre
          </Link>
          .
        </p>
      </Section>

      <Footer />
    </main>
  );
}
