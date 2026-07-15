"use client";

import { siteConfig } from "@/site";
import {
  Brain,
  Building2,
  Check,
  ChevronLeft,
  Compass,
  FileSearch,
  Handshake,
  Home,
  LayoutList,
  Link2,
  type LucideIcon,
  MessageCircle,
  MessagesSquare,
  Plus,
  Puzzle,
  Swords,
  Target,
  Terminal,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { StickyScroll } from "@/components/ui/sticky-scroll-reveal";

/**
 * Staggered entrance for a panel row. Panels remount when their stage becomes
 * active (keyed by index in the sticky reveal), so the stagger replays on every
 * stage change. Reduced-motion users get the final state instantly.
 */
function Stagger({
  index,
  children,
  className,
}: {
  index: number;
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 * index, duration: 0.3 }}
      className={className}>
      {children}
    </motion.div>
  );
}

/** A mini card mirroring the scout form's Card + tertiary icon header. */
function FormCard({
  icon: Icon,
  title,
  sub,
  index,
  children,
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <Stagger index={index}>
      <div className="bg-card ring-foreground/10 rounded-xl p-4 ring-1">
        <h3 className="text-tertiary font-display flex items-center text-base font-medium capitalize">
          <Icon className="mr-2 h-4 w-4 opacity-40" aria-hidden="true" />
          {title}
        </h3>
        <p className="text-muted-foreground font-display mt-1 text-xs">{sub}</p>
        <div className="mt-3">{children}</div>
      </div>
    </Stagger>
  );
}

/** A picker chip, styled exactly like the real form's Button (default/outline). */
function Chip({
  icon: Icon,
  code,
  label,
  on,
}: {
  icon: LucideIcon;
  code?: string;
  label: string;
  on: boolean;
}) {
  return (
    <span
      className={`font-display inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium ${
        on
          ? "bg-primary text-primary-foreground"
          : "border-border dark:bg-input/30 text-foreground border bg-transparent"
      }`}>
      <Icon className="size-3.5" aria-hidden="true" />
      {code && <span className="font-mono text-[10px] tracking-widest opacity-70">{code}</span>}
      {label}
    </span>
  );
}

/** A mock text field matching the form's label + Input look. */
function Field({
  label,
  hint,
  value,
  placeholder,
  caret,
}: {
  label: string;
  hint?: string;
  value?: string;
  placeholder?: string;
  caret?: boolean;
}) {
  return (
    <div>
      <p className="text-tertiary/60 font-display text-xs font-medium">
        {label}
        {hint && <span className="text-muted-foreground"> {hint}</span>}
      </p>
      <div className="border-border dark:bg-input/30 mt-1.5 flex h-9 items-center rounded-lg border px-3">
        {value ? (
          <span className="font-display text-sm">{value}</span>
        ) : (
          <span className="font-display text-muted-foreground text-sm">{placeholder}</span>
        )}
        {caret && <span className="bg-foreground ml-0.5 inline-block h-4 w-px animate-pulse" />}
      </div>
    </div>
  );
}

/** 01 · Target: the scout form as it really looks: target card, rounds, sections, effort. */
function TargetPanel() {
  // The seven real interview categories from CATEGORY_META, with their real icons.
  const rounds: { icon: LucideIcon; code: string; label: string; on: boolean }[] = [
    { icon: Puzzle, code: "DSA", label: "Algorithmic Coding", on: true },
    { icon: Building2, code: "SYS", label: "System Design", on: true },
    { icon: Brain, code: "DOM", label: "Domain Quiz", on: false },
    { icon: Home, code: "TKH", label: "Take-home Project", on: false },
    { icon: Users, code: "PAIR", label: "Pair Programming", on: false },
    { icon: MessageCircle, code: "BEH", label: "Behavioral", on: true },
    { icon: Handshake, code: "HR", label: "HR / Culture", on: false },
  ];
  // The four real report sections from SECTION_META, with their real icons.
  const sections: { icon: LucideIcon; code: string; label: string; on: boolean }[] = [
    { icon: Building2, code: "CO", label: "The company", on: true },
    { icon: Compass, code: "LOOP", label: "The loop", on: true },
    { icon: Wrench, code: "SKL", label: "Skills required", on: true },
    { icon: MessagesSquare, code: "EXP", label: "Interview experiences", on: false },
  ];
  // The real effort presets: label, credit ceiling, blurb.
  const efforts = [
    {
      label: "Low",
      credits: 50,
      blurb: "Quick scan, fewer searches, the essentials only",
      on: false,
    },
    { label: "Medium", credits: 100, blurb: "Balanced, the default depth", on: true },
    { label: "High", credits: 200, blurb: "Exhaustive, widest search, most questions", on: false },
  ];
  return (
    <div className="bg-background/50 flex h-full flex-col gap-3 overflow-y-auto p-4">
      <FormCard
        icon={Target}
        title="Target"
        sub="The company and role you are interviewing for, helps find relevant questions."
        index={0}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company" hint="*" value="Stripe" caret />
          <Field label="Company URL" hint="· preferred" placeholder="https://stripe.com" />
          <Field label="Role" placeholder="Senior Backend Engineer" />
          <Field label="Years of experience" placeholder="3-5" />
        </div>
      </FormCard>

      <FormCard
        icon={Swords}
        title="Rounds to Scout"
        sub="You can add more rounds later, from the finished report."
        index={1}>
        <div className="flex flex-wrap gap-2">
          {rounds.map((r) => (
            <Chip key={r.code} icon={r.icon} code={r.code} label={r.label} on={r.on} />
          ))}
          <Chip icon={Plus} label="Add round" on={false} />
        </div>
      </FormCard>

      <FormCard
        icon={LayoutList}
        title="Report Sections"
        sub="Drop what you already know, you are only charged for what the run researches."
        index={2}>
        <div className="flex flex-wrap gap-2">
          {sections.map((s) => (
            <Chip key={s.code} icon={s.icon} code={s.code} label={s.label} on={s.on} />
          ))}
        </div>
      </FormCard>

      <FormCard
        icon={Zap}
        title="Effort"
        sub="How wide the agent searches, and its spend ceiling."
        index={3}>
        <div className="grid gap-2 sm:grid-cols-3">
          {efforts.map((e) => (
            <div
              key={e.label}
              className={`flex flex-col gap-1 rounded-lg px-3 py-2.5 ${
                e.on
                  ? "bg-primary text-primary-foreground"
                  : "border-border dark:bg-input/30 border bg-transparent"
              }`}>
              <span className="flex w-full items-baseline justify-between gap-2">
                <span className="font-display text-sm font-medium">{e.label}</span>
                <span
                  className={`font-mono text-[10px] font-medium ${e.on ? "opacity-70" : "text-tertiary"}`}>
                  <ChevronLeft className="inline h-3 w-3" />
                  <span className="font-bold">{e.credits}</span>
                </span>
              </span>
              <span
                className={`font-display text-[11px] leading-snug ${
                  e.on ? "opacity-70" : "text-muted-foreground"
                }`}>
                {e.blurb}
              </span>
            </div>
          ))}
        </div>
      </FormCard>
    </div>
  );
}

/** 02 · Research: a terminal streaming the pipeline as it actually runs. */
function ResearchPanel() {
  const lines = [
    { text: "resolving company domain…", note: "stripe.com", muted: true },
    { text: "planning 7 queries · system design, behavioral…", note: "plan ok", muted: false },
    { text: "scanning stripe.com/blog…", note: "3 posts", muted: true },
    { text: "reading interview reviews…", note: "+12 new", muted: false },
    { text: "parsing job description…", note: "ok", muted: true },
    { text: "watching public talks…", note: "4 found", muted: true },
    { text: "extracting 5 full pages…", note: "done", muted: true },
    { text: "direct evidence rich · skipping broaden", note: "✓", muted: false },
    { text: "compressing 12 sources…", note: "notes ready", muted: true },
    { text: "synthesizing report…", note: "24 questions", muted: false },
  ];
  return (
    <div className="flex h-full flex-col bg-neutral-950 font-mono text-xs text-neutral-300">
      <div className="flex items-center gap-2 border-b border-neutral-800 px-4 py-2.5">
        <Terminal className="h-3.5 w-3.5 text-neutral-500" />
        <span className="text-[11px] text-neutral-500">interview-scout · research</span>
        <span className="ml-auto text-[11px] text-neutral-600">02:47 elapsed</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {lines.map((l, i) => (
          <Stagger key={l.text} index={i} className="flex items-center justify-between">
            <span className={l.muted ? "text-neutral-500" : "text-neutral-200"}>{l.text}</span>
            <span className={l.muted ? "text-neutral-600" : "text-tertiary"}>{l.note}</span>
          </Stagger>
        ))}
        <Stagger index={lines.length}>
          <div className="bg-tertiary/10 mt-3 flex items-center justify-between rounded px-2 py-1.5">
            <span className="text-tertiary">
              <span className="bg-tertiary mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full align-middle" />
              stripe.com/careers · Senior Engineer
            </span>
            <span className="text-tertiary font-semibold">MATCH 92%</span>
          </div>
        </Stagger>
      </div>
      <div className="flex items-center justify-between border-t border-neutral-800 px-4 py-2 text-[11px] text-neutral-600">
        <span>metered · charged what the run spends</span>
        <span>
          cost so far <span className="text-tertiary">$0.31</span> · cap $1.00
        </span>
      </div>
    </div>
  );
}

/** A single predicted question inside the sample report. */
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
          className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold tracking-wide uppercase ${tone}`}>
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

/** 03 · Report: a realistic sample report, grouped by round, scrollable. */
function SampleReportPanel() {
  return (
    <div className="flex h-full flex-col">
      {/* Report window chrome */}
      <div className="border-border flex items-center gap-2 border-b px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
        </div>
        <span className="font-display text-muted-foreground ml-1 text-xs font-medium">
          Stripe · Senior Engineer report
        </span>
        <span className="text-tertiary border-tertiary/30 bg-tertiary/10 ml-auto rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-wide uppercase">
          24 questions
        </span>
      </div>
      <div className="border-border text-muted-foreground flex items-center gap-3 border-b px-4 py-1.5 font-mono text-[10px]">
        <span>12 sources</span>
        <span>·</span>
        <span>
          evidence <span className="text-status-good">rich</span>
        </span>
        <span>·</span>
        <span>3 rounds</span>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <Stagger index={0}>
          <p className="text-muted-foreground mb-2 font-mono text-[10px] tracking-widest uppercase">
            System Design · 3 predicted
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
        </Stagger>

        <Stagger index={1}>
          <p className="text-muted-foreground mb-2 font-mono text-[10px] tracking-widest uppercase">
            Algorithmic Coding · 2 predicted
          </p>
          <div className="space-y-2.5">
            <SampleQuestion
              confidence="High"
              question="Given a stream of transactions, detect duplicates within a sliding time window."
              sources={["Interview review · Glassdoor", "Interview review · Blind"]}
              note="Hash map plus deque; talk through the memory trade-off at Stripe's volume."
            />
          </div>
        </Stagger>

        <Stagger index={2}>
          <p className="text-muted-foreground mb-2 font-mono text-[10px] tracking-widest uppercase">
            Behavioral · 2 predicted
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
        </Stagger>
      </div>
    </div>
  );
}

/** 04 · Prep: a likelihood-ordered checklist you tick off after the interview. */
function PrepPanel() {
  const items = [
    { q: "Idempotency in the payments API", tag: "High", done: true },
    { q: "Design Stripe's webhook delivery system", tag: "High", done: true },
    { q: "Rate limiting at scale", tag: "High", done: false },
    { q: "Duplicate detection in a transaction stream", tag: "High", done: false },
    { q: "Behavioral: a time you disagreed with a lead", tag: "Medium", done: false },
    { q: "Why Stripe? Product and culture fit", tag: "Medium", done: false },
  ];
  const doneCount = items.filter((i) => i.done).length;
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-5">
      <Stagger index={0}>
        <div className="flex items-center gap-2">
          <FileSearch className="text-tertiary h-4 w-4" />
          <span className="font-display text-sm font-semibold">Prep order · most likely first</span>
          <span className="text-muted-foreground ml-auto font-mono text-[10px]">
            {doneCount} of {items.length} rehearsed
          </span>
        </div>
        <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
          <div
            className="bg-tertiary h-full rounded-full transition-all"
            style={{ width: `${(doneCount / items.length) * 100}%` }}
          />
        </div>
      </Stagger>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <Stagger key={it.q} index={i + 1}>
            <li className="border-border flex items-center gap-3 rounded-lg border px-3 py-2.5">
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
              <span
                className={`ml-auto shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-[9px] tracking-wide uppercase ${
                  it.tag === "High"
                    ? "text-status-good border-status-good/30 bg-status-good/10"
                    : "text-status-warning border-status-warning/30 bg-status-warning/10"
                }`}>
                {it.tag}
              </span>
            </li>
          </Stagger>
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
  <SampleReportPanel key="report" />,
  <PrepPanel key="prep" />,
];

export function HowItWorksSection() {
  const { howItWorks } = siteConfig.copy;
  const stages = howItWorks.stages.map((stage, i) => ({ ...stage, content: PANELS[i] }));

  return (
    <section id="how-it-works" className="mx-auto w-full max-w-3xl border-t px-5 py-12">
      <div className="mb-8 text-center">
        <p className="text-tertiary mb-3 font-mono text-xs font-semibold tracking-[0.25em] uppercase">
          {howItWorks.eyebrow}
        </p>
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {howItWorks.title}
        </h2>
        <p className="font-display text-muted-foreground mt-2">{howItWorks.sub}</p>
      </div>
      <StickyScroll content={stages} />
    </section>
  );
}
