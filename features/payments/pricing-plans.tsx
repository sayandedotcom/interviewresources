import { siteConfig } from "@/site";
import { Check } from "lucide-react";

import { BuyCreditsButton } from "@/features/payments/buy-credits-button";

/**
 * The credit-pack cards, shared by the marketing pricing section and the in-app
 * payments page so the two can't drift apart. Which plan is highlighted and what
 * each badge says both come from `config/pricing.ts` rather than an index check,
 * so reordering the packs can't silently move the highlight.
 */
export function PricingPlans() {
  return (
    <>
      {/* Cards stretch to a shared height so the CTAs line up across plans. */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {siteConfig.pricingPlans.map((plan) => (
          <div
            key={plan.slug}
            className={`silver-edge relative flex flex-col rounded-3xl p-8 ${
              plan.featured
                ? "from-brand-100/90 to-brand-50/30 z-10 bg-gradient-to-b shadow-[var(--shadow-xl)] lg:scale-[1.04]"
                : "bg-card shadow-[var(--shadow-sm)]"
            }`}>
            {/* z-10 clears silver-edge's ::before ring, which sits at z-index 1 and
              would otherwise paint straight across the badge text. */}
            <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap shadow-[var(--shadow-sm)] ${
                  plan.featured
                    ? "bg-primary text-primary-foreground"
                    : // Needs its own border: the fill matches the card behind it, so
                      // without one the card's top edge reads as a line struck
                      // through the badge text.
                      "bg-card border-border text-muted-foreground border"
                }`}>
                {plan.badge}
              </span>
            </div>

            <h2 className="font-display text-2xl font-semibold tracking-tight">{plan.name}</h2>
            <p className="font-display text-muted-foreground mt-1.5 text-base">
              {plan.description}
            </p>

            <div className="mt-6 flex items-baseline gap-1.5">
              <span className="font-display text-5xl font-bold tracking-tight">${plan.price}</span>
              <span className="font-display text-muted-foreground text-base">one-off</span>
            </div>
            <p className="font-display text-muted-foreground mt-1 text-sm">
              {plan.credits} credits
            </p>

            <ul className="border-border/60 mt-7 space-y-3 border-t pt-7">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      plan.featured ? "bg-primary/20" : "bg-muted"
                    }`}>
                    <Check
                      className={`h-3 w-3 ${plan.featured ? "text-primary" : "text-muted-foreground/70"}`}
                      strokeWidth={3}
                    />
                  </span>
                  <span className="font-display text-base">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-8">
              <BuyCreditsButton plan={plan.slug} variant="glossy" className="h-11 w-full text-base">
                Get started
              </BuyCreditsButton>
            </div>
          </div>
        ))}
      </div>

      <p className="font-display text-muted-foreground mt-8 text-center text-sm">
        {siteConfig.pricingNote}
      </p>
    </>
  );
}
