"use client";

import { Link2 } from "lucide-react";

/**
 * The hero's mock report card.
 *
 * This used to be the same component the how-it-works "Report" stage rendered.
 * That stage now shows a real captured run (see `components/sample-report.ts`),
 * which opens on the company write-up — right for a walkthrough the reader is
 * stepping through, wrong for a hero, where the card is a glance and has to lead
 * with the questions. So the two parted ways and the hero kept this one:
 * illustrative, short, and question-first by construction.
 */
function SampleQuestion({
  confidence,
  question,
  sources,
  note,
}: {
  confidence: "High" | "Medium";
  question: string;
  sources: string[];
  note: string;
}) {
  const tone =
    confidence === "High"
      ? "text-status-good border-status-good/30 bg-status-good/10"
      : "text-status-warning border-status-warning/30 bg-status-warning/10";

  return (
    <div className="border-border bg-background rounded-lg border p-3.5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-sm leading-snug font-semibold">{question}</p>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wide uppercase ${tone}`}>
          {confidence}
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {sources.map((s) => (
          <span key={s} className="text-tertiary flex items-center gap-1.5 text-[11px]">
            <Link2 className="h-3 w-3 shrink-0" />
            <span className="hover:underline">{s}</span>
          </span>
        ))}
      </div>
      <p className="text-muted-foreground font-display mt-2 text-xs">
        <span className="text-foreground font-medium">Prep:</span> {note}
      </p>
    </div>
  );
}

/**
 * `revealRows` staggers the three category groups in. The hero mounts once, so
 * it can afford the cascade; it stays a prop (rather than always-on) because a
 * caller that remounts this panel would otherwise re-deal the cards on every
 * remount. Kept in CSS rather than Motion so a remount stays cheap regardless.
 */
export function HeroReportPanel({ revealRows = false }: { revealRows?: boolean }) {
  const group = revealRows
    ? "animate-in fade-in slide-in-from-bottom-1 fill-mode-both ease-out-strong duration-400 motion-reduce:slide-in-from-bottom-0"
    : "";

  return (
    <div className="flex h-full flex-col">
      <div className="border-border flex items-center gap-2 border-b px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-neutral-300" />
          <span className="size-2.5 rounded-full bg-neutral-300" />
          <span className="size-2.5 rounded-full bg-neutral-300" />
        </div>
        <span className="font-display text-muted-foreground ml-1 text-xs font-medium">
          Stripe · Senior Engineer report
        </span>
        <span className="text-tertiary border-tertiary/30 bg-tertiary/10 ml-auto rounded-full border px-2 py-0.5 text-[9px] tracking-wide uppercase">
          24 questions
        </span>
      </div>
      <div className="border-border text-muted-foreground flex items-center gap-3 border-b px-4 py-1.5 text-[10px]">
        <span>12 sources</span>
        <span>·</span>
        <span>
          evidence <span className="text-status-good">rich</span>
        </span>
        <span>·</span>
        <span>3 rounds</span>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className={`${group} delay-500`}>
          <p className="text-muted-foreground mb-2 text-[10px] tracking-widest uppercase">
            System Design · 3 questions
          </p>
          <div className="space-y-2.5">
            <SampleQuestion
              confidence="High"
              question="Design a rate limiter for the payments API. How do you handle idempotency keys?"
              sources={["Stripe Engineering blog", "Interview review · levels.fyi"]}
              note="Cover token storage, retry windows, and duplicate requests mid-flight."
            />
            <SampleQuestion
              confidence="High"
              question="How would you design a globally consistent ledger for money movement?"
              sources={["Increment · distributed systems", "Public tech talk"]}
              note="Discuss double-entry accounting, idempotency, and eventual consistency trade-offs."
            />
          </div>
        </div>

        <div className={`${group} delay-[560ms]`}>
          <p className="text-muted-foreground mb-2 text-[10px] tracking-widest uppercase">
            Algorithmic Coding · 2 questions
          </p>
          <div className="space-y-2.5">
            <SampleQuestion
              confidence="High"
              question="Given a stream of transactions, detect duplicates within a sliding time window."
              sources={["Interview review · Glassdoor", "Interview review · Blind"]}
              note="Hash map plus deque; talk through the memory trade-off at Stripe's volume."
            />
          </div>
        </div>

        <div className={`${group} delay-[620ms]`}>
          <p className="text-muted-foreground mb-2 text-[10px] tracking-widest uppercase">
            Behavioral · 2 questions
          </p>
          <div className="space-y-2.5">
            <SampleQuestion
              confidence="Medium"
              question="Tell me about a time you shipped under an ambiguous deadline."
              sources={["Company values page"]}
              note="Anchor to Stripe's 'move with urgency' value; quantify the outcome."
            />
            <SampleQuestion
              confidence="Medium"
              question="Describe a disagreement with a teammate about an API design. How did it resolve?"
              sources={["Interview review · Glassdoor"]}
              note="Show you argued from user impact, not preference, and committed after the call."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
