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

export const metadata = { title: siteConfig.copy.howItWorks.metaTitle };

const benefitIcons = [Clock, Wallet, Gauge];

export default function HowItWorksPage() {
  const { howItWorks } = siteConfig.copy;

  return (
    <main className="flex flex-1 flex-col">
      <Header />

      <section className="mx-auto w-full max-w-3xl px-5 py-16">
        <div className="text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            {howItWorks.heroTitle}
          </h1>
          <p className="font-display text-muted-foreground mx-auto mt-4 max-w-xl text-lg">
            {howItWorks.heroSub}
          </p>
        </div>

        {/* Why it's worth it */}
        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {howItWorks.benefits.map((benefit, i) => {
            const Icon = benefitIcons[i];
            return (
              <div key={benefit.title} className="bg-card rounded-xl border p-5">
                <div className="bg-tertiary/10 flex h-10 w-10 items-center justify-center rounded-full">
                  <Icon className="text-tertiary h-5 w-5" />
                </div>
                <h3 className="font-display mt-4 text-base font-semibold">{benefit.title}</h3>
                <p className="font-display text-muted-foreground mt-2 text-sm">{benefit.body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.22em] uppercase">
            {howItWorks.stepsOverline}
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
          <h2 className="font-display text-2xl font-semibold">{howItWorks.ctaBox.title}</h2>
          <p className="font-display text-muted-foreground mx-auto mt-2 max-w-md">
            {howItWorks.ctaBox.sub}
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              href={howItWorks.ctaBox.primary.href}
              className="bg-tertiary font-display text-tertiary-foreground hover:bg-tertiary/90 cursor-pointer rounded-lg px-6 py-2.5 text-sm font-medium transition-colors">
              {howItWorks.ctaBox.primary.label}
            </Link>
            <Link
              href={howItWorks.ctaBox.secondary.href}
              className="border-border font-display hover:bg-muted cursor-pointer rounded-lg border px-6 py-2.5 text-sm font-medium transition-colors">
              {howItWorks.ctaBox.secondary.label}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
