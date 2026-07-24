"use client";

import { siteConfig } from "@/site";
import {
  Brain,
  Building2,
  Check,
  CircleDashed,
  Compass,
  FileSearch,
  Handshake,
  Home,
  Info,
  LayoutList,
  Link2,
  type LucideIcon,
  MessageCircle,
  MessagesSquare,
  Plus,
  Puzzle,
  Swords,
  Target,
  Trash2,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { StickyScroll } from "@/components/ui/sticky-scroll-reveal";

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
        <h3 className="text-muted-foreground font-display flex items-center text-lg font-medium capitalize">
          <Icon className="text-primary mr-2.5 h-5 w-5 shrink-0" aria-hidden="true" />
          {title}
        </h3>
        <p className="text-muted-foreground font-display mt-1 text-xs">{sub}</p>
        <div className="mt-4">{children}</div>
      </div>
    </Stagger>
  );
}

function Chip({ icon: Icon, label, on }: { icon: LucideIcon; label: string; on: boolean }) {
  return (
    <span
      className={`font-display inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium ${
        on
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-foreground bg-background"
      }`}>
      {on && <Check className="h-4 w-4 shrink-0" strokeWidth={2.75} aria-hidden="true" />}
      <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
      {label}
    </span>
  );
}

function Field({
  label,
  hint,
  info,
  value,
  placeholder,
  caret,
  area,
  wide,
}: {
  label: string;
  hint?: string;
  info?: boolean;
  value?: string;
  placeholder?: string;
  caret?: boolean;
  area?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`grid gap-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <div className="flex items-center gap-1">
        <p className="text-foreground font-display text-sm font-medium">
          {label}
          {hint && <span className="text-muted-foreground"> {hint}</span>}
        </p>
        {info && <Info className="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      </div>
      <div
        className={`border-input bg-muted flex rounded-lg border px-2.5 ${
          area ? "min-h-16 items-start py-2" : "h-8 items-center"
        }`}>
        {value ? (
          <p className={`font-display text-sm ${area ? "leading-relaxed" : ""}`}>{value}</p>
        ) : (
          <p className="font-display text-muted-foreground text-sm">{placeholder}</p>
        )}
        {caret && <span className="bg-foreground ml-0.5 inline-block h-4 w-px animate-pulse" />}
      </div>
    </div>
  );
}

function TargetPanel() {
  const rounds: { icon: LucideIcon; label: string; on: boolean }[] = [
    { icon: Puzzle, label: "Algorithmic Coding", on: true },
    { icon: Building2, label: "System Design", on: true },
    { icon: Brain, label: "Domain Quiz", on: false },
    { icon: Home, label: "Take-home Project", on: false },
    { icon: Users, label: "Pair Programming", on: false },
    { icon: MessageCircle, label: "Behavioral", on: true },
    { icon: Handshake, label: "HR / Culture", on: false },
  ];
  const sections: { icon: LucideIcon; label: string; on: boolean }[] = [
    { icon: Building2, label: "The company", on: true },
    { icon: Compass, label: "The loop", on: true },
    { icon: Wrench, label: "Skills required", on: true },
    { icon: MessagesSquare, label: "Interview experiences", on: false },
  ];
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
    <div className="bg-background flex h-full flex-col gap-3 overflow-y-auto p-4">
      <FormCard
        icon={Target}
        title="Target"
        sub="The company and role you are interviewing for, helps find relevant questions."
        index={0}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company" hint="*" value="Stripe" caret />
          <Field label="Company URL" hint="· preferred" info value="https://stripe.com" />
          <Field label="Role / level" hint="· optional" value="Senior Backend Engineer" />
          <Field label="Years of Experience" hint="· optional" value="3-5" />
          <Field label="Team / org" hint="· optional" info value="Payments Infra" />
          <Field label="Location" hint="· optional" value="Bengaluru, India" />
          <Field
            label="Tech Stack"
            hint="· optional"
            info
            wide
            value="React, Node.js, PostgreSQL"
          />
          <Field
            label="Job Description"
            hint="· optional"
            info
            area
            wide
            value="Own the payments ledger service. Design idempotent APIs and keep them reliable past 10k req/s."
          />
          <Field
            label="Recruiter notes"
            hint="· optional"
            info
            area
            wide
            value="Phone screen done. Next: two coding rounds, a system design round, and a team-fit chat."
          />
          <div className="grid gap-1.5 sm:col-span-2">
            <div className="flex items-center gap-1">
              <p className="text-foreground font-display text-sm font-medium">
                Interviewers <span className="text-muted-foreground">· optional</span>
              </p>
              <Info className="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </div>
            <div className="flex items-center gap-2">
              <div className="border-input bg-muted flex h-8 flex-1 items-center rounded-lg border px-2.5">
                <span className="font-display text-sm">Jordan · Payments Eng Manager</span>
              </div>
              <div className="border-input bg-muted flex h-8 flex-1 items-center rounded-lg border px-2.5">
                <span className="font-display text-sm">linkedin.com/in/jordan-eng</span>
              </div>
              <Trash2 className="text-muted-foreground/50 h-4 w-4 shrink-0" aria-hidden="true" />
            </div>
            <Chip icon={Plus} label="Add interviewer" on={false} />
          </div>
        </div>
      </FormCard>

      <FormCard
        icon={Swords}
        title="Rounds to Gather"
        sub="You can add more rounds later, from the finished report."
        index={1}>
        <div className="flex flex-wrap gap-2">
          {rounds.map((r) => (
            <Chip key={r.label} icon={r.icon} label={r.label} on={r.on} />
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
            <Chip key={s.label} icon={s.icon} label={s.label} on={s.on} />
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
              className={`flex flex-col gap-1 rounded-lg border px-3 py-2.5 ${
                e.on ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"
              }`}>
              <span className="flex w-full items-baseline justify-between gap-2">
                <span className="font-display text-sm font-medium">{e.label}</span>
                <span
                  className={`text-[11px] font-medium ${e.on ? "text-primary" : "text-muted-foreground"}`}>
                  up to <span className="font-bold">{e.credits}</span>
                </span>
              </span>
              <span
                className={`font-display text-[11px] leading-snug ${
                  e.on ? "text-primary/70" : "text-muted-foreground"
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

function ResearchPanel() {
  const lines: { text: string; note: string; status: "done" | "active" | "pending" }[] = [
    { text: "Resolving company domain", note: "stripe.com", status: "done" },
    { text: "Planning 7 queries · system design, behavioral", note: "plan ok", status: "done" },
    { text: "Scanning stripe.com/blog", note: "3 posts", status: "done" },
    { text: "Reading interview reviews", note: "+12 new", status: "done" },
    { text: "Parsing job description", note: "ok", status: "done" },
    { text: "Watching public talks", note: "4 found", status: "done" },
    { text: "Extracting 5 full pages", note: "done", status: "done" },
    { text: "Direct evidence rich · skipping broaden", note: "", status: "active" },
    { text: "Compressing 12 sources", note: "", status: "pending" },
    { text: "Synthesizing report", note: "24 questions", status: "pending" },
  ];
  const done = lines.filter((l) => l.status === "done").length;
  const pct = Math.round((done / lines.length) * 100);

  return (
    <div className="flex h-full flex-col">
      <div className="border-border/60 border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="bg-tertiary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
            <span className="bg-tertiary relative inline-flex h-2 w-2 rounded-full" />
          </span>
          <span className="font-display text-sm font-semibold">Researching…</span>
          <span className="text-muted-foreground ml-auto text-xs">02:47 elapsed</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="bg-brand-100 h-1.5 flex-1 overflow-hidden rounded-full">
            <div className="bg-tertiary h-full rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-muted-foreground text-xs tabular-nums">{pct}%</span>
        </div>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto p-5">
        {lines.map((l, i) => (
          <Stagger key={l.text} index={i} className="flex items-center gap-3">
            {l.status === "done" && (
              <span className="bg-tertiary/15 flex h-4 w-4 shrink-0 items-center justify-center rounded-full">
                <Check className="text-tertiary h-2.5 w-2.5" strokeWidth={3} />
              </span>
            )}
            {l.status === "active" && (
              <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                <span className="bg-tertiary absolute h-2 w-2 animate-ping rounded-full opacity-75" />
                <span className="bg-tertiary relative h-2 w-2 rounded-full" />
              </span>
            )}
            {l.status === "pending" && (
              <CircleDashed className="text-muted-foreground/40 h-4 w-4 shrink-0" />
            )}
            <span
              className={`font-display text-sm ${
                l.status === "pending"
                  ? "text-muted-foreground/60"
                  : l.status === "active"
                    ? "text-foreground font-medium"
                    : "text-foreground/80"
              }`}>
              {l.text}
            </span>
            {l.note && (
              <span
                className={`ml-auto shrink-0 text-xs ${
                  l.status === "pending" ? "text-muted-foreground/50" : "text-tertiary"
                }`}>
                {l.note}
              </span>
            )}
          </Stagger>
        ))}

        <Stagger index={lines.length}>
          <div className="bg-tertiary/10 mt-4 flex items-center justify-between gap-3 rounded-lg px-3 py-2.5">
            <span className="text-tertiary font-display text-sm font-medium">
              stripe.com/careers · Senior Engineer
            </span>
            <span className="text-tertiary shrink-0 text-xs font-semibold">MATCH 92%</span>
          </div>
        </Stagger>
      </div>

      <div className="border-border/60 text-muted-foreground flex items-center justify-between border-t px-5 py-3 text-xs">
        <span>metered · charged what the run spends</span>
        <span>
          cost so far <span className="text-tertiary font-medium">$0.31</span> · cap $1.00
        </span>
      </div>
    </div>
  );
}

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

export function SampleReportPanel() {
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
        <Stagger index={0}>
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
        </Stagger>

        <Stagger index={1}>
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
        </Stagger>

        <Stagger index={2}>
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
        </Stagger>
      </div>
    </div>
  );
}

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
          <span className="text-muted-foreground ml-auto text-[10px]">
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
                className={`ml-auto shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] tracking-wide uppercase ${
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
        Mark what actually came up; it sharpens every future report.
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
    <section
      id="how-it-works"
      className="mx-auto w-full max-w-7xl px-6 pt-16 pb-12 md:px-8 md:pt-20">
      <div className="mb-12 text-center">
        <p className="text-tertiary mb-3 text-xs font-semibold tracking-[0.25em] uppercase">
          {howItWorks.eyebrow}
        </p>
        <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {howItWorks.title}
        </h2>
        <p className="font-display text-muted-foreground mt-4 text-lg leading-relaxed">
          {howItWorks.sub}
        </p>
      </div>
      <StickyScroll content={stages} />
    </section>
  );
}
