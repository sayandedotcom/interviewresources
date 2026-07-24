import { siteConfig } from "@/site";
import { CircleAlert, FileText, Lock, Search, ShieldCheck, Sparkles } from "lucide-react";

import { Section, SectionHeader } from "@/components/sections/section";

const TOPICS = [
  {
    title: "Direct evidence first",
    body: "The agent starts with first-hand interview reports, engineering blogs, job descriptions, and public talks. Questions stay tied to source links so you can inspect the evidence yourself.",
    Icon: Search,
  },
  {
    title: "Sparse-data fallback",
    body: "When public interview data is thin, the run broadens into founder background, company stage, comparable companies, and role norms for early-stage startups. That fallback is called out instead of hidden.",
    Icon: FileText,
  },
  {
    title: "Enforced confidence rules",
    body: "No citation means no high confidence. Inferred questions cannot be marked High, even if the model tries. Those limits are applied after generation, not left as polite instructions.",
    Icon: Lock,
  },
];

export function TrustSection() {
  const { confidence, sourcing } = siteConfig.copy;

  return (
    <Section id="trust" tone="plain">
      <SectionHeader
        eyebrow={sourcing.eyebrow}
        title="Why trust the research?"
        sub="The product shows what it found, labels what it inferred, and caps confidence when the evidence is thin."
      />

      <div className="space-y-6">
        <div className="silver-edge from-brand-100/90 to-brand-50/20 rounded-[2rem] bg-gradient-to-br via-white p-5 shadow-[var(--shadow-sm)] sm:p-6">
          <div className="bg-card rounded-[1.5rem] p-6 shadow-[var(--shadow-md)] sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-start justify-between gap-4 sm:justify-start sm:gap-5">
                  <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-2xl">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <span className="bg-brand-50 text-brand-700 rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.16em] uppercase">
                    Read before trust
                  </span>
                </div>

                <h3 className="font-display mt-5 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
                  The report tells you what is solid, what is inferred, and why.
                </h3>
                <p className="text-muted-foreground mt-4 max-w-2xl text-lg leading-relaxed">
                  Confidence is not decoration here. It is how the product separates direct evidence
                  from thin signals and forces the cautious answer when the data does not deserve
                  more.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:w-[34rem] lg:grid-cols-1">
                <div className="border-border/60 bg-muted/30 rounded-2xl border px-4 py-3">
                  <p className="text-muted-foreground text-[10px] tracking-[0.18em] uppercase">
                    Direct evidence
                  </p>
                  <p className="font-display mt-1 text-sm font-medium">
                    Source-linked questions stay inspectable.
                  </p>
                </div>
                <div className="border-border/60 bg-muted/30 rounded-2xl border px-4 py-3">
                  <p className="text-muted-foreground text-[10px] tracking-[0.18em] uppercase">
                    Sparse data
                  </p>
                  <p className="font-display mt-1 text-sm font-medium">
                    Fallback paths are labeled, not hidden.
                  </p>
                </div>
                <div className="border-border/60 bg-muted/30 rounded-2xl border px-4 py-3">
                  <p className="text-muted-foreground text-[10px] tracking-[0.18em] uppercase">
                    Confidence rules
                  </p>
                  <p className="font-display mt-1 text-sm font-medium">
                    No citation means no inflated certainty.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {TOPICS.map((topic, index) => (
            <article
              key={topic.title}
              className={`silver-edge rounded-[2rem] p-5 shadow-[var(--shadow-sm)] sm:p-6 ${
                index === 0
                  ? "bg-gradient-to-br from-violet-100/80 via-white to-violet-50/40"
                  : index === 1
                    ? "bg-gradient-to-br from-sky-100/80 via-white to-sky-50/40"
                    : "bg-gradient-to-br from-amber-100/80 via-white to-amber-50/40"
              }`}>
              <div className="bg-card h-full rounded-[1.5rem] p-6 shadow-[var(--shadow-md)]">
                <span className="bg-primary/10 text-primary flex h-11 w-11 items-center justify-center rounded-2xl">
                  <topic.Icon className="h-5 w-5" />
                </span>
                <h3 className="font-display mt-5 max-w-[12rem] text-2xl font-semibold tracking-tight">
                  {topic.title}
                </h3>
                <p className="text-muted-foreground mt-3 text-base leading-relaxed">{topic.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <details className="silver-edge from-brand-50/80 to-brand-100/60 mt-8 rounded-[2rem] bg-gradient-to-br via-white p-5 shadow-[var(--shadow-sm)] sm:p-6">
        <div className="bg-card rounded-[1.5rem] p-6 shadow-[var(--shadow-md)]">
          <summary className="font-display flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold tracking-tight">
            <span className="flex items-center gap-3">
              <span className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
                <CircleAlert className="h-5 w-5 shrink-0" />
              </span>
              <span>Selected under-the-hood details</span>
            </span>
            <Sparkles className="text-muted-foreground h-5 w-5 shrink-0" />
          </summary>
          <div className="text-muted-foreground mt-5 grid gap-4 text-base leading-relaxed md:grid-cols-3">
            <div className="border-border/60 bg-muted/25 rounded-2xl border p-4">
              <p className="font-display text-foreground text-sm font-semibold">
                What counts as evidence
              </p>
              <p className="mt-2 text-sm leading-relaxed">{sourcing.beats[1]?.body}</p>
            </div>
            <div className="border-border/60 bg-muted/25 rounded-2xl border p-4">
              <p className="font-display text-foreground text-sm font-semibold">
                What inferred means
              </p>
              <p className="mt-2 text-sm leading-relaxed">{confidence.inferred.body}</p>
            </div>
            <div className="border-border/60 bg-muted/25 rounded-2xl border p-4">
              <p className="font-display text-foreground text-sm font-semibold">
                What happens for thin companies
              </p>
              <p className="mt-2 text-sm leading-relaxed">
                {siteConfig.copy.unknownCompanies.closer}
              </p>
            </div>
          </div>
        </div>
      </details>
    </Section>
  );
}
