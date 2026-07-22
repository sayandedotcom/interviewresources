import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { PricingSection } from "@/components/sections/pricing-section";

import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  path: "/pricing",
  title: "Pricing",
  description:
    "Buy credits once and spend them only when you run a report. A typical report is under $0.50 — no subscription, no monthly fee.",
});

export default function PricingPage() {
  return (
    <main className="flex flex-1 flex-col">
      <Header />
      <PricingSection />
      <Footer />
    </main>
  );
}
