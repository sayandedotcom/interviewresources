import { siteConfig } from "@/site";

import { ConfidenceExplainerSection } from "@/components/confidence-explainer-section";
import { CtaSection } from "@/components/cta-section";
import { Footer } from "@/components/footer";
import { FounderNoteSection } from "@/components/founder-note-section";
import { Header } from "@/components/header";
import { HowAgentWorksSection } from "@/components/how-agent-works-section";
import { HowItWorksSection } from "@/components/how-it-works-section";
import { HowWeSourceSection } from "@/components/how-we-source-section";
import { CompaniesSection } from "@/components/sections/companies-section";
import { ComparisonSection } from "@/components/sections/comparison-section";
import { FaqSection } from "@/components/sections/faq-section";
import { GuaranteeSection } from "@/components/sections/guarantee-section";
import { HeroSection } from "@/components/sections/hero-section";
import { PricingSection } from "@/components/sections/pricing-section";
import { StatsSection } from "@/components/sections/stats-section";
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

      {/* <ResearchExperience /> */}

      <HowItWorksSection />

      <HowAgentWorksSection />

      <HowWeSourceSection />

      <StatsSection />

      <CompaniesSection />

      <WhyNotChatgptSection />

      <ConfidenceExplainerSection />

      <ComparisonSection />

      <FaqSection />

      <GuaranteeSection />

      <PricingSection />

      <FounderNoteSection />

      <CtaSection />

      <Footer />
    </main>
  );
}
