import { siteConfig } from "@/site";
import { Check } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BuyCreditsButton } from "@/features/payments/buy-credits-button";
import { MAX_RUN_CREDITS } from "@/lib/credits";

export default function PricingPage() {
  return (
    <main className="flex flex-1 flex-col">
      <Header />

      <section className="mx-auto w-full max-w-3xl px-5 py-16">
        <div className="text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 font-display text-muted-foreground">
            Buy credits, spend them on reports. A report costs what it costs to research —
            typically about 46 credits, and never more than {MAX_RUN_CREDITS}.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {siteConfig.pricingPlans.map((plan, index) => (
            <div
              key={plan.slug}
              className={`relative rounded-xl border bg-card p-6 ${index === 1 ? "border-tertiary/30" : ""}`}
            >
              {index === 1 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-tertiary/20 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-tertiary">
                    Popular
                  </span>
                </div>
              )}
              <div className="mb-4">
                <h2 className="font-display text-xl font-semibold">
                  {plan.name}
                </h2>
                <p className="mt-1 font-display text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <span className="font-display text-4xl font-bold">
                  ${plan.price}
                </span>
                <span className="font-display text-muted-foreground">
                  {" "}
                  for {plan.credits} credits
                </span>
              </div>

              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className={`h-4 w-4 shrink-0 ${index === 1 ? "text-tertiary" : "text-primary"}`} />
                    <span className="font-display text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <BuyCreditsButton
                plan={plan.slug}
                className={`mt-6 w-full ${
                  index === 1 ? "bg-tertiary text-tertiary-foreground hover:bg-tertiary/90" : ""
                }`}
              >
                Get started
              </BuyCreditsButton>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
