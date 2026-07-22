import { siteConfig } from "@/site";

import { Section } from "@/components/sections/section";

import { MAX_RUN_CREDITS } from "@/lib/credits";

import { PricingPlans } from "@/features/payments/pricing-plans";

export function PricingSection() {
  const { landing } = siteConfig.copy;

  return (
    <Section id="pricing" tone="plain">
      <div className="text-center">
        <p className="font-display text-muted-foreground mb-4 text-lg font-medium italic">
          {landing.pricing.fomo}
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {landing.pricing.title}
        </h1>
        <p className="font-display text-muted-foreground mx-auto mt-4 max-w-2xl text-lg leading-relaxed">
          {landing.pricing.subBeforeCap} {MAX_RUN_CREDITS}.
        </p>
      </div>

      <div className="mt-14">
        <PricingPlans />
      </div>
    </Section>
  );
}
