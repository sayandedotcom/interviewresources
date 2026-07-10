import Link from "next/link";

import { siteConfig } from "@/site";
import {
  Clock,
  FileText,
  Gauge,
  Link2,
  ListChecks,
  Search,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

export default function HowItWorksPage() {
  return (
    <main className="flex flex-1 flex-col">
      <Header />

      <section className="mx-auto w-full max-w-3xl px-5 py-16">
        <div className="text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Walk into the interview already knowing the questions
          </h1>
          <p className="font-display text-muted-foreground mx-auto mt-4 max-w-xl text-lg">
            Instead of spending your evenings hunting through blogs, forums, and Glassdoor threads,
            you paste one company name. Our AI does the digging and hands you the questions
            you&apos;re most likely to face — each one backed by real evidence you can check
            yourself.
          </p>
        </div>

        {/* Why it's worth it */}
        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          <div className="bg-card rounded-xl border p-5">
            <div className="bg-tertiary/10 flex h-10 w-10 items-center justify-center rounded-full">
              <Clock className="text-tertiary h-5 w-5" />
            </div>
            <h3 className="font-display mt-4 text-base font-semibold">Save hours of research</h3>
            <p className="font-display text-muted-foreground mt-2 text-sm">
              What normally takes an evening of manual searching takes about 3 minutes. You get a
              finished report while you grab a coffee.
            </p>
          </div>
          <div className="bg-card rounded-xl border p-5">
            <div className="bg-tertiary/10 flex h-10 w-10 items-center justify-center rounded-full">
              <Wallet className="text-tertiary h-5 w-5" />
            </div>
            <h3 className="font-display mt-4 text-base font-semibold">Costs less than a coffee</h3>
            <p className="font-display text-muted-foreground mt-2 text-sm">
              A full report runs about $0.40 — no subscription, no coaching fees, no hourly rate.
              You only pay for the reports you actually run.
            </p>
          </div>
          <div className="bg-card rounded-xl border p-5">
            <div className="bg-tertiary/10 flex h-10 w-10 items-center justify-center rounded-full">
              <Gauge className="text-tertiary h-5 w-5" />
            </div>
            <h3 className="font-display mt-4 text-base font-semibold">Prep with confidence</h3>
            <p className="font-display text-muted-foreground mt-2 text-sm">
              Stop guessing what to study. Focus your limited prep time on the questions most likely
              to come up — and know why each one made the list.
            </p>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.22em] uppercase">
            From company name to a prep plan in four steps
          </p>
        </div>

        <div className="mt-16 space-y-16">
          <div className="flex gap-6">
            <div className="bg-tertiary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
              <Target className="text-tertiary h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">
                1. Tell us who you&apos;re meeting
              </h2>
              <p className="font-display text-muted-foreground mt-2">
                Type the name of the company you&apos;re interviewing with. That&apos;s the only
                thing we really need — no long forms, no account setup to get a result.
              </p>
              <p className="font-display text-muted-foreground mt-2 text-sm">
                Know your interviewer? Add their name or LinkedIn and we&apos;ll factor in their
                public talks and writing — used only as a search clue, never by scraping their
                profile. Then pick the rounds you care about: coding, system design, behavioral, or
                the whole loop.
              </p>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="bg-tertiary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
              <Search className="text-tertiary h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">2. Our AI does the digging</h2>
              <p className="font-display text-muted-foreground mt-2">
                In the time it takes to read this page, our AI reads the public web for you —
                studying how this company actually runs its interviews and what it values in
                engineers.
              </p>
              <p className="font-display text-muted-foreground mt-2 text-sm">
                It scans engineering blogs, job descriptions, first-hand interview reviews from past
                candidates, and public talks by the team — then connects the dots between the
                company&apos;s product, tech stack, and culture to work out what they&apos;re likely
                to ask. Typical research finishes in about 3 minutes.
              </p>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="bg-tertiary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
              <FileText className="text-tertiary h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">
                3. Read your personalized report
              </h2>
              <p className="font-display text-muted-foreground mt-2">
                You get a clean, personalized report — a list of the questions you&apos;re most
                likely to hear, grouped by round so you can study one area at a time. This
                isn&apos;t a generic question bank; it&apos;s built for this company, right now.
                Every question comes with three things:
              </p>
              <ul className="mt-4 space-y-3">
                <li className="font-display text-muted-foreground flex items-start gap-3 text-sm">
                  <Gauge className="text-tertiary mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong>A confidence level</strong> — high, medium, or low — so you know which
                    questions are near-certain and which are longer shots. Study the sure things
                    first.
                  </span>
                </li>
                <li className="font-display text-muted-foreground flex items-start gap-3 text-sm">
                  <Link2 className="text-tertiary mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong>The evidence behind it</strong> — every prediction links to the source
                    it came from, so you can verify it yourself. No black box, no wishful thinking.
                  </span>
                </li>
                <li className="font-display text-muted-foreground flex items-start gap-3 text-sm">
                  <ListChecks className="text-tertiary mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong>Prep notes</strong> — a short guide to what a strong answer should
                    cover, so you know exactly how to practice each one.
                  </span>
                </li>
              </ul>
              <p className="font-display text-muted-foreground mt-3 text-sm">
                Keep it open on the day, or export it to PDF or JSON to study offline.
              </p>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="bg-tertiary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
              <Sparkles className="text-tertiary h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">4. Show up prepared</h2>
              <p className="font-display text-muted-foreground mt-2">
                Your report suggests a prep order, so you spend your time where it counts most —
                starting with the questions most likely to appear. Every answer you rehearse is
                grounded in real evidence, not a lucky guess. That&apos;s the difference between
                hoping you&apos;re ready and knowing you are.
              </p>
              <p className="font-display text-muted-foreground mt-2 text-sm">
                Afterward, mark which questions actually came up. It takes a second, and it makes
                every future prediction sharper — for you and for everyone preparing after you.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card mt-16 rounded-xl border p-8 text-center">
          <h2 className="font-display text-2xl font-semibold">
            Your next interview is worth 3 minutes
          </h2>
          <p className="font-display text-muted-foreground mx-auto mt-2 max-w-md">
            Enter a company name and see the questions that might be coming. Your first look is free
            — no card, no commitment.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              href="/"
              className="bg-tertiary font-display text-tertiary-foreground hover:bg-tertiary/90 cursor-pointer rounded-lg px-6 py-2.5 text-sm font-medium transition-colors">
              Try it free
            </Link>
            <Link
              href="/pricing"
              className="border-border font-display hover:bg-muted cursor-pointer rounded-lg border px-6 py-2.5 text-sm font-medium transition-colors">
              View pricing
            </Link>
          </div>
        </div>

        <div className="border-border mt-12 rounded-lg border p-6">
          <h3 className="font-display text-lg font-semibold">Frequently asked</h3>
          <div className="mt-4 space-y-4">
            <div>
              <p className="font-display text-sm font-medium">How long does a report take?</p>
              <p className="font-display text-muted-foreground mt-1 text-sm">
                About 3 minutes on average. You start the research, and by the time you&apos;re back
                from making a coffee, your report is ready to read.
              </p>
            </div>
            <div>
              <p className="font-display text-sm font-medium">How much does it cost?</p>
              <p className="font-display text-muted-foreground mt-1 text-sm">
                A typical report costs around $0.40 — you buy credits once and spend them only when
                you run a report. No subscription, no monthly fee, and nothing like the price of an
                hour with an interview coach. Your first report is free.
              </p>
            </div>
            <div>
              <p className="font-display text-sm font-medium">Is this legal?</p>
              <p className="font-display text-muted-foreground mt-1 text-sm">
                Yes. We only use publicly available web search results. We never scrape LinkedIn or
                any private profiles. Interviewer names are used only as a search seed to find their
                public work.
              </p>
            </div>
            <div>
              <p className="font-display text-sm font-medium">How accurate are the predictions?</p>
              <p className="font-display text-muted-foreground mt-1 text-sm">
                Every question comes with a confidence score and evidence links. When evidence is
                strong, confidence is high. When we&apos;re inferring from limited data, we say so
                honestly.
              </p>
            </div>
            <div>
              <p className="font-display text-sm font-medium">What companies work best?</p>
              <p className="font-display text-muted-foreground mt-1 text-sm">
                Tech companies with active engineering blogs, published interview processes, or
                candidates who share their experiences online tend to have the richest data. Smaller
                companies or very new startups may have less available intel.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
