import { siteConfig } from "@/site";
import { Infinity as InfinityIcon, Coins, ShieldCheck } from "lucide-react";

import { Section } from "@/components/sections/section";

import { MAX_RUN_CREDITS } from "@/lib/credits";

import { PricingPlans } from "@/features/payments/pricing-plans";

const ICONS = [Coins, ShieldCheck, InfinityIcon];

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

      <div className="mt-8">
        <div className="silver-edge bg-background overflow-hidden rounded-3xl shadow-[var(--shadow-sm)]">
          <div className="divide-border/60 grid divide-y lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {siteConfig.copy.guarantee.items.map((item, index) => {
              const Icon = ICONS[index] ?? Coins;

              return (
                <div key={item.title} className="p-6 sm:p-8">
                  <span className="bg-muted flex h-11 w-11 items-center justify-center rounded-xl">
                    <Icon className="text-foreground/70 h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <h3 className="font-display mt-5 text-xl font-semibold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="font-display text-muted-foreground mt-2 text-base leading-relaxed">
                    {item.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Section>
  );
}
