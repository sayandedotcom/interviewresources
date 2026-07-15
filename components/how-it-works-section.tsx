"use client";

import { siteConfig } from "@/site";
import { Check, FileSearch, Link2, Terminal } from "lucide-react";

import { StickyScroll } from "@/components/ui/sticky-scroll-reveal";

/** 01 · Target: the scout form: company, interviewer, round chips. */
function TargetPanel() {
  const rounds = [
    { label: "Coding", on: true },
    { label: "System Design", on: true },
    { label: "Behavioral", on: false },
    { label: "The whole loop", on: false },
  ];
  return (
    <div className="flex h-full flex-col gap-4 p-5">
      <div>
        <p className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
          Company
        </p>
        <div className="border-tertiary/40 bg-tertiary/5 mt-1.5 flex items-center rounded-lg border px-3 py-2.5">
          <span className="font-display text-sm font-medium">Stripe</span>
          <span className="bg-foreground ml-0.5 inline-block h-4 w-px animate-pulse" />
        </div>
      </div>
      <div>
        <p className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
          Interviewer <span className="normal-case">(optional)</span>
        </p>
        <div className="border-border mt-1.5 rounded-lg border px-3 py-2.5">
          <span className="font-display text-muted-foreground text-sm">Add a name or LinkedIn</span>
        </div>
      </div>
      <div>
        <p className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
          Rounds
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {rounds.map((r) => (
            <span
              key={r.label}
              className={`font-display rounded-full border px-3 py-1 text-xs font-medium ${
                r.on
                  ? "border-tertiary bg-tertiary/10 text-tertiary"
                  : "border-border text-muted-foreground"
              }`}>
              {r.on && <Check className="mr-1 inline h-3 w-3" />}
              {r.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 02 · Research: a terminal streaming the sources the AI reads. */
function ResearchPanel() {
  const lines = [
    { text: "scanning stripe.com/blog…", note: "3 posts", muted: true },
    { text: "reading interview reviews…", note: "+12 new", muted: false },
    { text: "parsing job description…", note: "ok", muted: true },
    { text: "watching public talks…", note: "4 found", muted: true },
  ];
  return (
    <div className="flex h-full flex-col bg-neutral-950 font-mono text-xs text-neutral-300">
      <div className="flex items-center gap-2 border-b border-neutral-800 px-4 py-2.5">
        <Terminal className="h-3.5 w-3.5 text-neutral-500" />
        <span className="text-[11px] text-neutral-500">interview-scout · research</span>
        <span className="ml-auto text-[11px] text-neutral-600">02:47 elapsed</span>
      </div>
      <div className="flex-1 space-y-2 p-4">
        {lines.map((l) => (
          <div key={l.text} className="flex items-center justify-between">
            <span className={l.muted ? "text-neutral-500" : "text-neutral-200"}>{l.text}</span>
            <span className={l.muted ? "text-neutral-600" : "text-tertiary"}>{l.note}</span>
          </div>
        ))}
        <div className="bg-tertiary/10 mt-3 flex items-center justify-between rounded px-2 py-1.5">
          <span className="text-tertiary">
            <span className="bg-tertiary mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" />
            stripe.com/careers · Senior Engineer
          </span>
          <span className="text-tertiary font-semibold">MATCH 92%</span>
        </div>
      </div>
    </div>
  );
}

/** 03 · Report: a predicted-question card with confidence, evidence, prep note. */
function ReportPanel() {
  return (
    <div className="flex h-full flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
          System Design
        </span>
        <span className="text-status-good border-status-good/30 bg-status-good/10 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide uppercase">
          High confidence
        </span>
      </div>
      <p className="font-display text-base leading-snug font-semibold">
        Design a rate limiter for the payments API. How would you handle idempotency keys?
      </p>
      <div className="space-y-1.5">
        <p className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
          Evidence
        </p>
        {["Stripe Engineering blog · Idempotency", "Interview review · levels.fyi"].map((src) => (
          <div key={src} className="text-tertiary flex items-center gap-2 text-xs">
            <Link2 className="h-3.5 w-3.5 shrink-0" />
            <span className="hover:underline">{src}</span>
          </div>
        ))}
      </div>
      <div className="border-border bg-muted/40 mt-auto rounded-lg border p-3">
        <p className="text-muted-foreground font-display text-xs">
          <span className="text-foreground font-semibold">Prep note:</span> Cover token storage,
          retry windows, and what happens on a duplicate request mid-flight.
        </p>
      </div>
    </div>
  );
}

/** 04 · Prep: a likelihood-ordered checklist you tick off after the interview. */
function PrepPanel() {
  const items = [
    { q: "Idempotency in the payments API", done: true },
    { q: "Rate limiting at scale", done: true },
    { q: "Behavioral: a time you disagreed with a lead", done: false },
    { q: "Debugging a production incident", done: false },
  ];
  return (
    <div className="flex h-full flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <FileSearch className="text-tertiary h-4 w-4" />
        <span className="font-display text-sm font-semibold">Prep order · most likely first</span>
      </div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li
            key={it.q}
            className="border-border flex items-center gap-3 rounded-lg border px-3 py-2.5">
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                it.done ? "border-tertiary bg-tertiary" : "border-muted-foreground/40"
              }`}>
              {it.done && <Check className="text-tertiary-foreground h-3 w-3" />}
            </span>
            <span
              className={`font-display text-sm ${
                it.done ? "text-muted-foreground line-through" : "text-foreground"
              }`}>
              {it.q}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground font-display mt-auto text-xs">
        Mark what actually came up; it sharpens every future prediction.
      </p>
    </div>
  );
}

const PANELS = [
  <TargetPanel key="target" />,
  <ResearchPanel key="research" />,
  <ReportPanel key="report" />,
  <PrepPanel key="prep" />,
];

export function HowItWorksSection() {
  const { howItWorks } = siteConfig.copy;
  const stages = howItWorks.stages.map((stage, i) => ({ ...stage, content: PANELS[i] }));

  return (
    <section id="how-it-works" className="mx-auto w-full max-w-3xl border-t px-5 py-12">
      <div className="mb-8 text-center">
        <p className="text-muted-foreground mb-2 font-mono text-[11px] tracking-[0.22em] uppercase">
          {howItWorks.eyebrow}
        </p>
        <h2 className="font-display text-2xl font-semibold tracking-tight">{howItWorks.title}</h2>
        <p className="font-display text-muted-foreground mt-2">{howItWorks.sub}</p>
      </div>
      <StickyScroll content={stages} />
    </section>
  );
}
