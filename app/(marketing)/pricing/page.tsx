import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { PricingSection } from "@/components/sections/pricing-section";

export default function PricingPage() {
  return (
    <main className="flex flex-1 flex-col">
      <Header />
      <PricingSection />
      <Footer />
    </main>
  );
}
