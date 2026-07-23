import { siteConfig } from "@/site";

import { Section } from "@/components/sections/section";

import { MAX_RUN_CREDITS } from "@/lib/credits";

import { PricingPlans } from "@/features/payments/pricing-plans";

/**
 * Shared by `/pricing`, where this is the page's subject and so its `h1`, and
 * by the landing page, where the hero already owns the `h1` and a second one
 * would leave the document with two competing titles. The caller picks; the
 * default is the safe one, since only a page *about* pricing can claim `h1`.
 */
export function PricingSection({ as: Heading = "h2" }: { as?: "h1" | "h2" }) {
  const { landing } = siteConfig.copy;

  return (
    <Section id="pricing" tone="plain">
      <div className="text-center">
        <p className="font-display text-muted-foreground mb-4 text-lg font-medium italic">
          {landing.pricing.fomo}
        </p>
        <Heading className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {landing.pricing.title}
        </Heading>
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
