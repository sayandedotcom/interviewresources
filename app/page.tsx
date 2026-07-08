import { ResearchExperience } from "@/features/research/research-experience";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { siteConfig } from "@/site";
import Link from "next/link";

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
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              34,345 users
            </span>
          </div>
        </div>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
          Get the questions
          <br />
          before they ask them.
        </h1>
        <p className="mt-4 max-w-xl font-display text-[15px] leading-relaxed text-muted-foreground">
          Paste a company. We research its product, stack, engineering culture,
          reported interview loop, and — if you name one — the
          interviewer&rsquo;s public work, then predict the questions
          you&rsquo;re likely to face. Each one cites the evidence it came from.
        </p>
      </section>

      <ResearchExperience />

      <section className="mx-auto w-full max-w-3xl px-5 py-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          How it works
        </h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-3">
          <div>
            <p className="font-display text-sm font-semibold">1. Name a target</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the company — and an interviewer, if you know one.
            </p>
          </div>
          <div>
            <p className="font-display text-sm font-semibold">2. We research</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Product, stack, engineering culture, and reported interview loops
              from public sources.
            </p>
          </div>
          <div>
            <p className="font-display text-sm font-semibold">3. Get cited questions</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Every predicted question links back to the evidence it came from.
            </p>
          </div>
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
          <div className="mt-6">
            <Link
              href="/how-it-works"
              className="inline-block rounded-lg bg-primary px-8 py-3 font-display text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors cursor-pointer"
            >
              {siteConfig.cta.subtitle}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
