import { siteConfig } from "@/site";

import { CtaSection } from "@/components/cta-section";
import { Footer } from "@/components/footer";
import { FounderNoteSection } from "@/components/founder-note-section";
import { Header } from "@/components/header";
import { HowAgentWorksSection } from "@/components/how-agent-works-section";
import { HowItWorksSection } from "@/components/how-it-works-section";
import { AboutSection } from "@/components/sections/about-section";
import { CompaniesSection } from "@/components/sections/companies-section";
import { FaqSection } from "@/components/sections/faq-section";
import { HeroSection } from "@/components/sections/hero-section";
import { PricingSection } from "@/components/sections/pricing-section";
import { ProofStripSection } from "@/components/sections/proof-strip-section";
import { ResearchSourcesSection } from "@/components/sections/research-sources-section";
import { TrustSection } from "@/components/sections/trust-section";
import { UnknownCompaniesSection } from "@/components/unknown-companies-section";
import { WhyNotChatgptSection } from "@/components/why-not-chatgpt-section";

import { faqJsonLd } from "@/lib/seo/json-ld";
import { buildMetadata, siteTitle } from "@/lib/seo/metadata";

// import { ResearchExperience } from "@/features/research/research-experience";

export const metadata = buildMetadata({
  path: "/",
  title: siteConfig.name,
  absoluteTitle: siteTitle,
  description: siteConfig.copy.metaDescription,
});

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Scoped to this page because it's the only one that renders the FAQs. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Header />

      <HeroSection />

      <AboutSection />

      <ProofStripSection />

      <HowItWorksSection />

      <HowAgentWorksSection />

      <WhyNotChatgptSection />

      <PricingSection />

      <ResearchSourcesSection />

      <UnknownCompaniesSection />

      <TrustSection />

      <CompaniesSection />

      <FaqSection />

      <FounderNoteSection />

      <CtaSection />

      <Footer />
    </main>
  );
}
