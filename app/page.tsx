import { ResearchExperience } from "@/features/research/research-experience";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { siteConfig } from "@/site";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Header />

      <section className="mx-auto w-full max-w-3xl px-5 pt-12 pb-2">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Reconnaissance before the interview
          </p>
          <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              34,345 users
            </span>
          </div>
        </div>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
          Get the questions
          <br />
          before they ask{' '}
          <span className="relative inline-block">
            them.
            <span className="absolute -bottom-1 left-0 h-3 w-full bg-tertiary/20" />
          </span>
        </h1>
        <p className="mt-4 max-w-xl font-display text-[15px] leading-relaxed text-muted-foreground">
          Paste a company. We research its product, stack, engineering culture,
          reported interview loop, and — if you name one — the
          interviewer&rsquo;s public work, then predict the questions
          you&rsquo;re likely to face. Each one cites the evidence it came from.
        </p>
      </section>

      <ResearchExperience />

      <section className="mx-auto w-full max-w-3xl px-5 py-12 border-t">
        <div className="grid gap-8 sm:grid-cols-4">
          {siteConfig.stats.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="font-display text-3xl font-bold tracking-tight">{stat.value}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-5 py-12 border-t">
        <div className="text-center mb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Trusted for
          </p>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Prepare for top tech companies
          </h2>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {siteConfig.companies.map((company, i) => (
            <div
              key={i}
              className="rounded-full border bg-card px-4 py-2 font-display text-sm text-muted-foreground hover:border-tertiary/30 hover:text-foreground transition-colors cursor-default"
            >
              {company}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-5 py-12 border-t">
        <div className="text-center mb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            How it works
          </p>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Three steps to interview prep
          </h2>
          <p className="mt-2 font-display text-muted-foreground">
            From company name to evidence-backed questions in minutes
          </p>
        </div>
        <div className="relative">
          <div className="hidden sm:block absolute top-12 left-1/2 h-0.5 w-full -translate-x-1/2 bg-border" />
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="relative text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-tertiary/10 ring-4 ring-background">
                <span className="font-display text-lg font-bold text-tertiary">1</span>
              </div>
              <h3 className="mt-4 font-display text-sm font-semibold">Name your target</h3>
              <p className="mt-2 font-display text-xs text-muted-foreground">
                Enter the company, add an interviewer if you know them, select your rounds
              </p>
            </div>
            <div className="relative text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-tertiary/10 ring-4 ring-background">
                <span className="font-display text-lg font-bold text-tertiary">2</span>
              </div>
              <h3 className="mt-4 font-display text-sm font-semibold">We research</h3>
              <p className="mt-2 font-display text-xs text-muted-foreground">
                Our AI searches engineering blogs, interview reviews, and public data
              </p>
            </div>
            <div className="relative text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-tertiary/10 ring-4 ring-background">
                <span className="font-display text-lg font-bold text-tertiary">3</span>
              </div>
              <h3 className="mt-4 font-display text-sm font-semibold">Get your report</h3>
              <p className="mt-2 font-display text-xs text-muted-foreground">
                Questions with confidence scores, evidence links, and prep notes
              </p>
            </div>
          </div>
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-2 font-display text-sm text-tertiary hover:underline"
          >
            Learn more about how it works
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-5 py-12 border-t">
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Why Scouting Report?
          </h2>
          <p className="mt-2 font-display text-muted-foreground">
            The smarter way to prepare for technical interviews
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-4 text-left font-display text-sm font-semibold">Feature</th>
                <th className="p-4 text-center font-display text-sm font-semibold">Scouting Report</th>
                <th className="p-4 text-center font-display text-sm font-semibold text-muted-foreground">Generic Prep</th>
                <th className="p-4 text-center font-display text-sm font-semibold text-muted-foreground">Coaching</th>
              </tr>
            </thead>
            <tbody>
              {siteConfig.comparison.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-4 font-display text-sm">{row.feature}</td>
                  <td className="p-4 text-center">
                    {typeof row.us === 'boolean' ? (
                      row.us ? (
                        <Check className="mx-auto h-4 w-4 text-tertiary" />
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">—</span>
                      )
                    ) : (
                      <span className="font-display text-xs font-medium text-tertiary">{row.us}</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {typeof row.genericPrep === 'boolean' ? (
                      row.genericPrep ? (
                        <Check className="mx-auto h-4 w-4 text-muted-foreground" />
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">—</span>
                      )
                    ) : (
                      <span className="font-display text-xs text-muted-foreground">{row.genericPrep}</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {typeof row.coaching === 'boolean' ? (
                      row.coaching ? (
                        <Check className="mx-auto h-4 w-4 text-muted-foreground" />
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">—</span>
                      )
                    ) : (
                      <span className="font-display text-xs text-muted-foreground">{row.coaching}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-5 py-12 border-t">
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            What our users are saying
          </h2>
          <p className="mt-2 font-display text-muted-foreground">
            Don&apos;t just take our word for it. Here&apos;s what some of our users have to say about Scouting Report.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {siteConfig.testimonials.map((testimonial, i) => (
            <div key={i} className="rounded-xl border bg-card p-5">
              <p className="font-display text-sm text-foreground">&ldquo;{testimonial.content}&rdquo;</p>
              <div className="mt-4">
                <p className="font-display text-sm font-semibold">{testimonial.name}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-5 py-12 border-t">
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>
        <div className="space-y-4">
          {siteConfig.faqs.map((faq, i) => (
            <div key={i} className="rounded-lg border p-4">
              <p className="font-display text-sm font-semibold">{faq.question}</p>
              <p className="mt-2 font-display text-sm text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-5 py-16 border-t">
        <div className="text-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {siteConfig.cta.title}
          </h2>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              href="/how-it-works"
              className="inline-block rounded-lg bg-tertiary px-8 py-3 font-display text-sm font-medium text-tertiary-foreground hover:bg-tertiary/90 transition-colors cursor-pointer"
            >
              {siteConfig.cta.subtitle}
            </Link>
            <Link
              href="/pricing"
              className="inline-block rounded-lg border border-border px-8 py-3 font-display text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
