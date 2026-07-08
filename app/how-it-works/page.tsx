import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Search, FileText, Target, Sparkles } from "lucide-react";
import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <main className="flex flex-1 flex-col">
      <Header />

      <section className="mx-auto w-full max-w-3xl px-5 py-16">
        <div className="text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            How it works
          </h1>
          <p className="mt-4 font-display text-lg text-muted-foreground">
            Get the questions before they ask them — backed by real evidence
          </p>
        </div>

        <div className="mt-16 space-y-16">
          <div className="flex gap-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#AEF05A]/10">
              <Target className="h-6 w-6 text-[#AEF05A]" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">1. Tell us your target</h2>
              <p className="mt-2 font-display text-muted-foreground">
                Enter the company you&apos;re interviewing with. Add the interviewer&apos;s name or LinkedIn
                (optional) — we&apos;ll only use it as a search clue, never scrape their profile.
              </p>
              <p className="mt-2 font-display text-sm text-muted-foreground">
                Select the interview rounds you&apos;re preparing for: coding challenges, system design,
                behavioral questions, or the full loop.
              </p>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#AEF05A]/10">
              <Search className="h-6 w-6 text-[#AEF05A]" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">2. We do the research</h2>
              <p className="mt-2 font-display text-muted-foreground">
                While you wait, we search the web for publicly available information about
                how this company runs their interviews.
              </p>
              <p className="mt-2 font-display text-sm text-muted-foreground">
                We look at engineering blogs, job postings, interview reviews from candidates,
                and public talks by engineers — all the clues that reveal what questions
                actually get asked.
              </p>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#AEF05A]/10">
              <FileText className="h-6 w-6 text-[#AEF05A]" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">3. Get your report</h2>
              <p className="mt-2 font-display text-muted-foreground">
                You receive a personalized report with predicted questions, organized by category.
                Each question shows:
              </p>
              <ul className="mt-3 space-y-2">
                <li className="flex items-center gap-2 font-display text-sm text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#AEF05A]" />
                  <span><strong>Confidence level</strong> — high, medium, or low certainty</span>
                </li>
                <li className="flex items-center gap-2 font-display text-sm text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#AEF05A]" />
                  <span><strong>Evidence links</strong> — every prediction cites its source</span>
                </li>
                <li className="flex items-center gap-2 font-display text-sm text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#AEF05A]" />
                  <span><strong>Prep notes</strong> — what a strong answer should cover</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#AEF05A]/10">
              <Sparkles className="h-6 w-6 text-[#AEF05A]" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">4. Prep with confidence</h2>
              <p className="mt-2 font-display text-muted-foreground">
                Your report comes with a suggested prep order — start with the questions most
                likely to appear. Every answer you prepare is grounded in real evidence,
                not guesswork.
              </p>
              <p className="mt-2 font-display text-sm text-muted-foreground">
                After your interview, you can mark which questions actually appeared.
                This helps build accuracy over time — for you and for everyone else.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 rounded-xl border bg-card p-8 text-center">
          <h2 className="font-display text-2xl font-semibold">Ready to get started?</h2>
          <p className="mt-2 font-display text-muted-foreground">
            Enter a company name and see what questions might be coming.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              href="/"
              className="rounded-lg bg-[#AEF05A] px-6 py-2.5 font-display text-sm font-medium text-black hover:bg-[#AEF05A]/90 transition-colors cursor-pointer"
            >
              Try it free
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg border border-border px-6 py-2.5 font-display text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
            >
              View pricing
            </Link>
          </div>
        </div>

        <div className="mt-12 rounded-lg border border-border p-6">
          <h3 className="font-display text-lg font-semibold">Frequently asked</h3>
          <div className="mt-4 space-y-4">
            <div>
              <p className="font-display text-sm font-medium">Is this legal?</p>
              <p className="mt-1 font-display text-sm text-muted-foreground">
                Yes. We only use publicly available web search results. We never scrape
                LinkedIn or any private profiles. Interviewer names are used only as a
                search seed to find their public work.
              </p>
            </div>
            <div>
              <p className="font-display text-sm font-medium">How accurate are the predictions?</p>
              <p className="mt-1 font-display text-sm text-muted-foreground">
                Every question comes with a confidence score and evidence links. When
                evidence is strong, confidence is high. When we&apos;re inferring from limited
                data, we say so honestly.
              </p>
            </div>
            <div>
              <p className="font-display text-sm font-medium">What companies work best?</p>
              <p className="mt-1 font-display text-sm text-muted-foreground">
                Tech companies with active engineering blogs, published interview processes,
                or candidates who share their experiences online tend to have the richest
                data. Smaller companies or very new startups may have less available intel.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
