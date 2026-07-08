import { siteConfig } from "@/site";
import { Check } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

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
            Choose the plan that fits your interview prep needs
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {siteConfig.pricingPlans.map((plan) => (
            <div
              key={plan.name}
              className="relative rounded-xl border bg-card p-6"
            >
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
                  worth credits
                </span>
              </div>

              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    <span className="font-display text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <button className="mt-6 w-full rounded-lg bg-primary px-4 py-2 font-display text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors cursor-pointer">
                Get started
              </button>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
