import { siteConfig } from "@/site";
import { Check } from "lucide-react";

import { MAX_RUN_CREDITS, MIN_RUN_CREDITS } from "@/lib/credits";

import { BuyCreditsButton } from "@/features/payments/buy-credits-button";

export default function PaymentsPage() {
  if (!siteConfig.enablePayments) {
    return (
      <div className="container py-16 text-center">
        <h1 className="font-display mb-4 text-2xl font-bold">Payments</h1>
        <p className="font-display text-muted-foreground">Payments are currently disabled.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-16">
      <div className="text-center">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Credits</h1>
        <p className="font-display text-muted-foreground mt-4 text-sm">
          A report is billed at what it actually costs to research — typically about 46 credits, and
          never more than {MAX_RUN_CREDITS} or your remaining balance, whichever is lower. You need
          at least {MIN_RUN_CREDITS} credits to start one.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {siteConfig.pricingPlans.map((plan, index) => (
          <div
            key={plan.slug}
            className={`bg-card relative rounded-xl border p-6 ${index === 1 ? "border-tertiary/30" : ""}`}>
            {index === 1 && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-tertiary/20 text-tertiary rounded-full px-3 py-1 font-mono text-[10px] tracking-widest uppercase">
                  Most popular
                </span>
              </div>
            )}
            <div className="mb-4">
              <h2 className="font-display text-xl font-semibold">{plan.name}</h2>
              <p className="font-display text-muted-foreground mt-1 text-sm">{plan.description}</p>
            </div>

            <div className="mb-6">
              <span className="font-display text-4xl font-bold">${plan.price}</span>
              <span className="font-display text-muted-foreground">
                {" "}
                for {plan.credits} credits
              </span>
            </div>

            <ul className="space-y-3">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <Check
                    className={`h-4 w-4 shrink-0 ${index === 1 ? "text-tertiary" : "text-primary"}`}
                  />
                  <span className="font-display text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <BuyCreditsButton
              plan={plan.slug}
              className={`mt-6 w-full ${
                index === 1 ? "bg-tertiary text-tertiary-foreground hover:bg-tertiary/90" : ""
              }`}>
              Get started
            </BuyCreditsButton>
          </div>
        ))}
      </div>
    </div>
  );
}
