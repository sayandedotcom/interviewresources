import Link from "next/link";

import { siteConfig } from "@/site";
import { ArrowRight, Check } from "lucide-react";

import { CtaSection } from "@/components/cta-section";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

import { MAX_RUN_CREDITS } from "@/lib/credits";

import { BuyCreditsButton } from "@/features/payments/buy-credits-button";
import { ResearchExperience } from "@/features/research/research-experience";

export default function Home() {
  const { landing } = siteConfig.copy;

  return (
    <main className="flex flex-1 flex-col">
      <Header />

      <section className="mx-auto w-full max-w-3xl px-5 pt-12 pb-2">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.22em] uppercase">
            {landing.eyebrow}
          </p>
          <div className="bg-card flex items-center gap-2 rounded-full border px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="bg-tertiary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
              <span className="bg-tertiary relative inline-flex h-2 w-2 rounded-full"></span>
            </span>
            <span className="text-muted-foreground font-mono text-[10px]">{landing.badge}</span>
          </div>
        </div>
        <h1 className="font-display mt-3 max-w-2xl text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl">
          {landing.heroTitle.line1}
          <br />
          {landing.heroTitle.line2}{" "}
          <span className="relative inline-block">
            {landing.heroTitle.highlight}
            <span className="bg-tertiary/20 absolute -bottom-1 left-0 h-3 w-full" />
          </span>
        </h1>
        <p className="font-display text-muted-foreground mt-4 max-w-xl text-[15px] leading-relaxed">
          {landing.heroSub}
        </p>
        <div className="mt-6 flex gap-4">
          <Link
            href={landing.heroCtaPrimary.href}
            className="bg-tertiary font-display text-tertiary-foreground hover:bg-tertiary/90 cursor-pointer rounded-lg px-6 py-2.5 text-sm font-medium transition-colors">
            {landing.heroCtaPrimary.label}
          </Link>
          <Link
            href={landing.heroCtaSecondary.href}
            className="border-border font-display hover:bg-muted cursor-pointer rounded-lg border px-6 py-2.5 text-sm font-medium transition-colors">
            {landing.heroCtaSecondary.label}
          </Link>
        </div>
      </section>

      <ResearchExperience />

      <section className="mx-auto w-full max-w-3xl border-t px-5 py-12">
        <div className="grid gap-8 sm:grid-cols-4">
          {siteConfig.stats.map((stat, i) => (
            <div key={i} className="relative text-center">
              {i === 0 && <div className="bg-tertiary/5 absolute inset-0 -m-4 rounded-2xl" />}
              <p className="font-display text-tertiary text-3xl font-bold tracking-tight">
                {stat.value}
              </p>
              <p className="text-muted-foreground mt-1 font-mono text-[10px] tracking-widest uppercase">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl border-t px-5 py-12">
        <div className="mb-8 text-center">
          <p className="text-tertiary mb-2 font-mono text-[11px] tracking-[0.22em] uppercase">
            {landing.companies.eyebrow}
          </p>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {landing.companies.title}
          </h2>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {siteConfig.companies.map((company, i) => (
            <div
              key={i}
              className="bg-card border-border font-display text-muted-foreground hover:border-tertiary hover:text-tertiary cursor-default rounded-full border px-4 py-2 text-sm transition-colors">
              {company}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl border-t px-5 py-12">
        <div className="mb-8 text-center">
          <p className="text-muted-foreground mb-2 font-mono text-[11px] tracking-[0.22em] uppercase">
            {landing.steps.eyebrow}
          </p>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {landing.steps.title}
          </h2>
          <p className="font-display text-muted-foreground mt-2">{landing.steps.sub}</p>
        </div>
        <div className="relative">
          <div className="bg-border absolute top-12 left-1/2 hidden h-0.5 w-full -translate-x-1/2 sm:block" />
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="relative text-center">
              <div className="bg-tertiary/10 ring-background mx-auto flex h-12 w-12 items-center justify-center rounded-full ring-4">
                <span className="font-display text-tertiary text-lg font-bold">1</span>
              </div>
              <h3 className="font-display mt-4 text-sm font-semibold">Name your target</h3>
              <p className="font-display text-muted-foreground mt-2 text-xs">
                Enter the company, add an interviewer if you know them, select your rounds
              </p>
            </div>
            <div className="relative text-center">
              <div className="bg-tertiary/10 ring-background mx-auto flex h-12 w-12 items-center justify-center rounded-full ring-4">
                <span className="font-display text-tertiary text-lg font-bold">2</span>
              </div>
              <h3 className="font-display mt-4 text-sm font-semibold">We research</h3>
              <p className="font-display text-muted-foreground mt-2 text-xs">
                Our AI searches engineering blogs, interview reviews, and public data
              </p>
            </div>
            <div className="relative text-center">
              <div className="bg-tertiary/10 ring-background mx-auto flex h-12 w-12 items-center justify-center rounded-full ring-4">
                <span className="font-display text-tertiary text-lg font-bold">3</span>
              </div>
              <h3 className="font-display mt-4 text-sm font-semibold">Get your report</h3>
              <p className="font-display text-muted-foreground mt-2 text-xs">
                Questions with confidence scores, evidence links, and prep notes
              </p>
            </div>
          </div>
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/how-it-works"
            className="font-display text-tertiary inline-flex items-center gap-2 text-sm hover:underline">
            Learn more about how it works
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl border-t px-5 py-12">
        <div className="mb-8 text-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Why {siteConfig.name}?
          </h2>
          <p className="font-display text-muted-foreground mt-2">{landing.comparison.sub}</p>
        </div>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="font-display p-4 text-left text-sm font-semibold">Feature</th>
                <th className="font-display p-4 text-center text-sm font-semibold">
                  {siteConfig.name}
                </th>
                <th className="font-display text-muted-foreground p-4 text-center text-sm font-semibold">
                  Generic Prep
                </th>
                <th className="font-display text-muted-foreground p-4 text-center text-sm font-semibold">
                  Coaching
                </th>
              </tr>
            </thead>
            <tbody>
              {siteConfig.comparison.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="font-display p-4 text-sm">{row.feature}</td>
                  <td className="p-4 text-center">
                    {typeof row.us === "boolean" ? (
                      row.us ? (
                        <Check className="text-tertiary mx-auto h-4 w-4" />
                      ) : (
                        <span className="text-muted-foreground font-mono text-xs">—</span>
                      )
                    ) : (
                      <span className="font-display text-tertiary text-xs font-medium">
                        {row.us}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {typeof row.genericPrep === "boolean" ? (
                      row.genericPrep ? (
                        <Check className="text-muted-foreground mx-auto h-4 w-4" />
                      ) : (
                        <span className="text-muted-foreground font-mono text-xs">—</span>
                      )
                    ) : (
                      <span className="font-display text-muted-foreground text-xs">
                        {row.genericPrep}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {typeof row.coaching === "boolean" ? (
                      row.coaching ? (
                        <Check className="text-muted-foreground mx-auto h-4 w-4" />
                      ) : (
                        <span className="text-muted-foreground font-mono text-xs">—</span>
                      )
                    ) : (
                      <span className="font-display text-muted-foreground text-xs">
                        {row.coaching}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl border-t px-5 py-12">
        <div className="mb-8 text-center">
          <p className="text-tertiary mb-2 font-mono text-[11px] tracking-[0.22em] uppercase">
            {landing.faq.eyebrow}
          </p>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {landing.faq.title}
          </h2>
        </div>
        <div className="space-y-4">
          {siteConfig.faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-card border-border hover:border-tertiary/30 rounded-lg border p-4 transition-colors">
              <p className="font-display text-sm font-semibold">{faq.question}</p>
              <p className="font-display text-muted-foreground mt-2 text-sm">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-3xl border-t px-5 py-16">
        <div className="text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            {landing.pricing.title}
          </h1>
          <p className="font-display text-muted-foreground mt-4">
            {landing.pricing.subBeforeCap} {MAX_RUN_CREDITS}.
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
                <p className="font-display text-muted-foreground mt-1 text-sm">
                  {plan.description}
                </p>
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
      </section>

      <CtaSection />

      <Footer />
    </main>
  );
}
