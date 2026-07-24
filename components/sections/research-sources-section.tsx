import { siteConfig } from "@/site";
import { Check, FileText, Search, ShieldCheck, Sparkles } from "lucide-react";

import { Section, SectionHeader } from "@/components/sections/section";

function SearchTargetsCard() {
  const [hunt] = siteConfig.copy.sourcing.beats;

  return (
    <div className="silver-edge from-brand-100/90 to-brand-50/30 rounded-[2rem] bg-gradient-to-br via-white p-5 shadow-[var(--shadow-sm)] sm:p-6">
      <div className="border-border/50 bg-background overflow-hidden rounded-[1.5rem] border shadow-[var(--shadow-md)]">
        <div className="border-border/60 bg-muted/35 flex items-center gap-2 border-b px-4 py-3">
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-rose-300" />
            <span className="size-2.5 rounded-full bg-amber-300" />
            <span className="size-2.5 rounded-full bg-emerald-300" />
          </span>
          <span className="text-muted-foreground text-[11px] tracking-[0.18em] uppercase">
            Live search plan
          </span>
        </div>

        <div className="p-5">
          <div className="border-border/60 bg-muted/40 flex items-center gap-2 rounded-xl border px-3 py-2.5">
            <Search className="text-muted-foreground h-4 w-4 shrink-0" />
            <span className="text-sm text-violet-700">stripe backend interview experience</span>
            <span className="ml-auto rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
              query
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="border-border/60 bg-background text-muted-foreground rounded-full border px-3 py-1.5 text-[11px] tracking-[0.18em] uppercase">
              Search targets
            </span>
            <span className="border-border/60 bg-background text-muted-foreground rounded-full border px-3 py-1.5 text-[11px] tracking-[0.18em] uppercase">
              public web only
            </span>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {hunt.chips?.map((chip, index) => (
              <div
                key={chip}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
                  index % 3 === 0
                    ? "border-violet-200 bg-violet-50/70"
                    : index % 3 === 1
                      ? "border-sky-200 bg-sky-50/70"
                      : "border-brand-200 bg-brand-50/70"
                }`}>
                <Check className="h-4 w-4 shrink-0 text-violet-500" />
                <span className="font-display text-sm">{chip}</span>
              </div>
            ))}
          </div>

          <div className="border-border/60 mt-5 grid gap-3 border-t pt-4 sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground text-[10px] tracking-[0.18em] uppercase">Goal</p>
              <p className="font-display mt-1 text-sm font-medium">First-hand signals first</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] tracking-[0.18em] uppercase">Bias</p>
              <p className="font-display mt-1 text-sm font-medium">Interview evidence over fluff</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] tracking-[0.18em] uppercase">Rule</p>
              <p className="font-display mt-1 text-sm font-medium">No private or scraped data</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EvidenceRulesCard() {
  const [, count] = siteConfig.copy.sourcing.beats;
  const firstRule = siteConfig.copy.sourcing.rules.items[0];

  return (
    <div className="silver-edge to-brand-50/20 rounded-[2rem] bg-gradient-to-br from-emerald-100/90 via-white p-5 shadow-[var(--shadow-sm)] sm:p-6">
      <div className="bg-card rounded-[1.5rem] p-6 shadow-[var(--shadow-md)]">
        <div className="flex items-start justify-between gap-4">
          <div className="bg-primary/10 text-primary flex h-11 w-11 items-center justify-center rounded-2xl">
            <FileText className="h-5 w-5" />
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-emerald-700 uppercase">
            Evidence gate
          </span>
        </div>

        <h3 className="font-display mt-5 text-2xl font-semibold tracking-tight">{count.name}</h3>
        <p className="text-muted-foreground mt-3 text-base leading-relaxed">{count.body}</p>

        <div className="mt-6 space-y-3">
          <div className="border-border/60 bg-muted/30 flex items-start gap-3 rounded-2xl border px-4 py-3">
            <ShieldCheck className="text-primary mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-display text-sm font-semibold">
                Evidence threshold before shipping
              </p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                Thin reports broaden instead of pretending they are complete.
              </p>
            </div>
          </div>

          <div className="border-border/60 bg-muted/30 flex items-start gap-3 rounded-2xl border px-4 py-3">
            <Sparkles className="text-primary mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-display text-sm font-semibold">{firstRule?.rule}</p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {firstRule?.body}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResearchSourcesSection() {
  const { sourcing } = siteConfig.copy;
  const [hunt] = sourcing.beats;

  return (
    <Section id="how-we-source" tone="plain">
      <SectionHeader eyebrow={sourcing.eyebrow} title={sourcing.title} sub={sourcing.sub} />

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr] lg:items-start">
        <div>
          <SearchTargetsCard />
          {hunt.note && (
            <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-relaxed italic">
              {hunt.note}
            </p>
          )}
        </div>

        <EvidenceRulesCard />
      </div>
    </Section>
  );
}
