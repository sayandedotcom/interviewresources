"use client";

import { siteConfig } from "@/site";
import {
  BookOpen,
  Brain,
  Building2,
  Check,
  CircleDashed,
  ClipboardList,
  Compass,
  FileSearch,
  Handshake,
  HelpCircle,
  Home,
  Info,
  LayoutList,
  Lightbulb,
  Link2,
  type LucideIcon,
  MessageCircle,
  MessagesSquare,
  Mic,
  Plus,
  Puzzle,
  Swords,
  Target,
  Trash2,
  UserCheck,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

import { SAMPLE_REPORT, SAMPLE_RESEARCH, type SampleQuestion } from "@/components/sample-report";
import { StickyScroll } from "@/components/ui/sticky-scroll-reveal";

/* These panels used to stagger their contents in on mount. StickyScroll keys the
   active panel on the stage index, so every stage change remounted them and
   replayed the whole cascade — up to ~0.9s in ResearchPanel, on top of the
   crossfade. The crossfade already covers the swap; the stagger only ever
   delayed content the reader had already scrolled to. */

/* Every panel below is dressed from one real run — the Google · Software
   Engineer, Full Stack report captured in `sample-report.ts`. The form inputs,
   the progress log, the report body and the prep list all describe that same
   run, so a reader scrolling the four stages watches one story rather than four
   unrelated mockups. */

function FormCard({
  icon: Icon,
  title,
  sub,
  children,
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card ring-foreground/10 rounded-xl p-4 ring-1">
      <h3 className="text-muted-foreground font-display flex items-center text-lg font-medium capitalize">
        <Icon className="text-primary mr-2.5 h-5 w-5 shrink-0" aria-hidden="true" />
        {title}
      </h3>
      <p className="text-muted-foreground font-display mt-1 text-xs">{sub}</p>
      <div className="mt-4">{children}</div>
    </div>
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
        {caret && (
          <span className="bg-foreground ml-0.5 inline-block h-4 w-px animate-pulse motion-reduce:animate-none" />
        )}
      </div>
    </div>
  );
}

function TargetPanel() {
  /* Only the rounds and sections this run actually asked for are lit: two
     rounds (DSA, system design) and every section but the recruiter pitch,
     which is why the report carries no "How to impress the recruiter". */
  const rounds: { icon: LucideIcon; label: string; on: boolean }[] = [
    { icon: Puzzle, label: "Algorithmic Coding", on: true },
    { icon: Building2, label: "System Design", on: true },
    { icon: Brain, label: "Domain Quiz", on: false },
    { icon: Home, label: "Take-home Project", on: false },
    { icon: Users, label: "Pair Programming", on: false },
    { icon: MessageCircle, label: "Behavioral", on: false },
    { icon: Handshake, label: "HR / Culture", on: false },
  ];
  const sections: { icon: LucideIcon; label: string; on: boolean }[] = [
    { icon: Building2, label: "The company", on: true },
    { icon: Compass, label: "The loop", on: true },
    { icon: Wrench, label: "Skills required", on: true },
    { icon: MessagesSquare, label: "Interview experiences", on: true },
    { icon: UserCheck, label: "Impress the recruiter", on: false },
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
        sub="The company and role you are interviewing for, helps find relevant questions.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company" hint="*" value={SAMPLE_RESEARCH.companyName} caret />
          <Field label="Company URL" hint="· preferred" info placeholder="https://google.com" />
          <Field label="Role / level" hint="· optional" value={SAMPLE_RESEARCH.roleContext} />
          <Field label="Years of Experience" hint="· optional" placeholder="e.g. 2-4" />
          <Field label="Team / org" hint="· optional" info value="Core" />
          <Field label="Location" hint="· optional" value={SAMPLE_RESEARCH.location} />
          <Field
            label="Tech Stack"
            hint="· optional"
            info
            wide
            value="Java, Python, Go, TypeScript, Angular"
          />
          <Field
            label="Job Description"
            hint="· optional"
            info
            area
            wide
            value="Full stack development across back-end (Java, Python, Golang, C++) and front-end (JavaScript, TypeScript, Angular). The Core team builds the technical foundation behind Google's flagship products."
          />
          <Field
            label="Recruiter notes"
            hint="· optional"
            info
            area
            wide
            value="Recruiter screen done. Next: coding rounds on DSA, then a system design round."
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
                <span className="font-display text-sm">Komal Tanwani · Recruiter</span>
              </div>
              <div className="border-input bg-muted flex h-8 flex-1 items-center rounded-lg border px-2.5">
                <span className="font-display text-sm">linkedin.com/in/komaltanwani</span>
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
        sub="You can add more rounds later, from the finished report.">
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
        sub="Drop what you already know, you are only charged for what the run researches.">
        <div className="flex flex-wrap gap-2">
          {sections.map((s) => (
            <Chip key={s.label} icon={s.icon} label={s.label} on={s.on} />
          ))}
        </div>
      </FormCard>

      <FormCard icon={Zap} title="Effort" sub="How wide the agent searches, and its spend ceiling.">
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
  /* The counts are this run's real ones: 39 resources retained, 8 of them read
     in full and the rest kept as search previews, 20 questions synthesized. */
  const lines: { text: string; note: string; status: "done" | "active" | "pending" }[] = [
    { text: "Resolving company", note: "Google", status: "done" },
    { text: "Planning 11 queries · DSA, system design", note: "plan ok", status: "done" },
    { text: "Reading LeetCode interview experiences", note: "+18 found", status: "done" },
    { text: "Scanning r/leetcode threads", note: "3 posts", status: "done" },
    { text: "Parsing job description", note: "ok", status: "done" },
    { text: "Reading Google engineering culture write-ups", note: "2 sources", status: "done" },
    { text: "Extracting 8 full pages", note: "done", status: "done" },
    { text: "Direct evidence thin · broadening to L4/L5 India", note: "", status: "active" },
    { text: "Compressing 39 sources", note: "", status: "pending" },
    { text: "Synthesizing report", note: "20 questions", status: "pending" },
  ];
  const done = lines.filter((l) => l.status === "done").length;
  const pct = Math.round((done / lines.length) * 100);

  return (
    <div className="flex h-full flex-col">
      <div className="border-border/60 border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="bg-tertiary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 motion-reduce:animate-none" />
            <span className="bg-tertiary relative inline-flex h-2 w-2 rounded-full" />
          </span>
          <span className="font-display text-sm font-semibold">Researching…</span>
          <span className="text-muted-foreground ml-auto text-xs">02:09 elapsed</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="bg-brand-100 h-1.5 flex-1 overflow-hidden rounded-full">
            <div className="bg-tertiary h-full rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-muted-foreground text-xs tabular-nums">{pct}%</span>
        </div>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto p-5">
        {lines.map((l) => (
          <div key={l.text} className="flex items-center gap-3">
            {l.status === "done" && (
              <span className="bg-tertiary/15 flex h-4 w-4 shrink-0 items-center justify-center rounded-full">
                <Check className="text-tertiary h-2.5 w-2.5" strokeWidth={3} />
              </span>
            )}
            {l.status === "active" && (
              <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                <span className="bg-tertiary absolute h-2 w-2 animate-ping rounded-full opacity-75 motion-reduce:animate-none" />
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
          </div>
        ))}

        <div className="bg-tertiary/10 mt-4 flex items-center justify-between gap-3 rounded-lg px-3 py-2.5">
          <span className="text-tertiary font-display text-sm font-medium">
            leetcode.com · Google L5 Bangalore
          </span>
          <span className="text-tertiary shrink-0 text-xs font-semibold">MATCH 94%</span>
        </div>
      </div>

      <div className="border-border/60 text-muted-foreground flex items-center justify-between border-t px-5 py-3 text-xs">
        <span>metered · charged what the run spends</span>
        <span>
          cost so far{" "}
          <span className="text-tertiary font-medium">${SAMPLE_RESEARCH.costUsd.toFixed(2)}</span> ·
          cap $1.00
        </span>
      </div>
    </div>
  );
}

/* ── Report panel ────────────────────────────────────────────────────────
   A scaled-down restatement of `features/research/report-view.tsx`: the same
   sections, in the same order, with the same visual language. Two knowing
   departures, both presentational — the report's own controls (copy, export,
   "gather more") are dropped since nothing here is interactive, and confidence
   is rendered at the top of the scale rather than this run's medium/low. */

function ReportSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
      {children}
    </p>
  );
}

function ReportHeading({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <h3 className="font-display text-muted-foreground flex items-center gap-1.5 text-sm font-semibold tracking-tight">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {children}
    </h3>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

const BASIS_LABEL: Record<SampleQuestion["basis"], string> = {
  reconstructed: "Reconstructed",
  baseline: "Role baseline",
};

function QuestionCard({ q }: { q: SampleQuestion }) {
  // `basis` and confidence moved together on this run — every reconstructed
  // question scored above every baseline one — so one drives the other here.
  const strong = q.basis === "reconstructed";

  return (
    <div className="border-border bg-background rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2.5">
        <p className="font-display text-[13px] leading-snug font-medium">{q.question}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-muted-foreground border-border rounded-full border px-1.5 py-0.5 text-[9px]">
            {BASIS_LABEL[q.basis]}
          </span>
          <span
            className={`text-[11px] leading-none ${strong ? "text-primary" : "text-muted-foreground"}`}
            title={`Confidence: ${strong ? "High" : "Medium"}`}>
            {strong ? "●●●" : "●●○"}
          </span>
        </div>
      </div>
      <p className="text-muted-foreground font-display mt-1.5 text-[11px] leading-relaxed">
        {q.rationale}
      </p>
      <p className="text-muted-foreground font-display mt-1.5 text-[11px] leading-relaxed">
        <span className="text-foreground font-medium">Prep note:</span> {q.prepNote}
      </p>
      {q.evidenceUrls.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {q.evidenceUrls.map((url) => (
            <span
              key={url}
              className="text-tertiary border-border flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px]">
              <Link2 className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
              {hostOf(url)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const ROUNDS = [
  { cat: "dsa", code: "DSA", label: "Algorithmic Coding", icon: Puzzle },
  { cat: "system_design", code: "SYS", label: "System Design", icon: Building2 },
] as const;

const RESOURCE_KIND_LABEL: Record<string, string> = {
  interview_experience: "Interview experiences",
  company_engineering: "Company engineering",
  company_docs: "Company docs",
  discussion: "Discussions",
  video: "Videos",
  other: "Other resources",
};

const ACCESS_LABEL: Record<string, string> = {
  full_text: "Read in full",
  search_preview: "Search preview",
};

/**
 * No entrance stagger here: this panel is PANELS[2] in the sticky-scroll
 * stepper, keyed on the active stage, so it remounts on every stage change and
 * any mount animation would re-deal the sections each time the reader moved
 * between stages — the exact bug the Stagger removal above fixed. The hero's
 * card, which mounts once and can afford a cascade, is a separate component
 * (`components/sections/hero-report-panel.tsx`).
 */
function SampleReportPanel() {
  const kinds = [...new Set(SAMPLE_REPORT.researchResources.map((r) => r.kind))];

  return (
    <div className="flex h-full flex-col">
      <div className="border-border flex items-center gap-2 border-b px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-neutral-300" />
          <span className="size-2.5 rounded-full bg-neutral-300" />
          <span className="size-2.5 rounded-full bg-neutral-300" />
        </div>
        <span className="font-display text-muted-foreground ml-1 truncate text-xs font-medium">
          {SAMPLE_RESEARCH.companyName} · {SAMPLE_RESEARCH.roleContext} report
        </span>
        {/* One text node, not `{n} questions` — React splits that with a comment
            node, and `tracking-wide` then swallows the space between them. */}
        <span className="text-tertiary border-tertiary/30 bg-tertiary/10 ml-auto shrink-0 rounded-full border px-2 py-0.5 text-[9px] tracking-wide uppercase">
          {`${SAMPLE_REPORT.questions.length} questions`}
        </span>
      </div>
      <div className="border-border text-muted-foreground flex items-center gap-3 border-b px-4 py-1.5 text-[10px]">
        <span>{SAMPLE_REPORT.researchResources.length} sources</span>
        <span>·</span>
        <span>
          evidence <span className="text-status-good">rich</span>
        </span>
        <span>·</span>
        <span>{ROUNDS.length} rounds</span>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {/* The company */}
        <div>
          <ReportHeading icon={Building2}>The company</ReportHeading>
          <p className="font-display text-foreground mt-2 text-[12px] leading-relaxed">
            {SAMPLE_REPORT.companySnapshot}
          </p>
          <div className="bg-primary/10 border-primary/40 mt-2.5 rounded-md border-l-2 px-3 py-2">
            <ReportSectionLabel>
              <Lightbulb className="mr-1 inline h-3 w-3" aria-hidden="true" />
              In plain terms
            </ReportSectionLabel>
            <p className="font-display text-foreground mt-1 text-[12px] leading-relaxed">
              {SAMPLE_REPORT.companyExplainer}
            </p>
          </div>
        </div>

        {/* The loop */}
        <div>
          <ReportSectionLabel>
            <Compass className="mr-1 inline h-3 w-3" aria-hidden="true" />
            The loop
          </ReportSectionLabel>
          <p className="font-display border-primary text-foreground mt-1.5 border-l-2 pl-3 text-[12px] leading-relaxed">
            {SAMPLE_REPORT.likelyLoopStructure}
          </p>
        </div>

        {/* The interviewer */}
        <div>
          <div className="border-border bg-card rounded-lg border p-3">
            <ReportSectionLabel>
              <Mic className="mr-1 inline h-3 w-3" aria-hidden="true" />
              The interviewer
            </ReportSectionLabel>
            <p className="font-display text-foreground mt-1 text-[12px] leading-relaxed">
              {SAMPLE_REPORT.interviewerSummary}
            </p>
          </div>
        </div>

        {/* Skills required */}
        <div>
          <ReportHeading icon={Wrench}>Skills required</ReportHeading>
          <p className="text-muted-foreground font-display mt-1 text-[11px] leading-relaxed">
            What the role actually demands — including what the job post leaves unsaid.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SAMPLE_REPORT.skillsRequired.map((s) => (
              <span
                key={s.skill}
                title={s.why}
                className="border-border font-display rounded-full border px-2 py-0.5 text-[11px]">
                {s.skill}
              </span>
            ))}
          </div>
        </div>

        {/* Pinpointed questions */}
        <div>
          <ReportHeading icon={HelpCircle}>Pinpointed questions</ReportHeading>
          <div className="mt-3 space-y-5">
            {ROUNDS.map(({ cat, code, label, icon: Icon }) => {
              const questions = SAMPLE_REPORT.questions.filter((q) => q.category === cat);
              return (
                <div key={cat}>
                  <div className="flex items-baseline gap-2">
                    <Icon className="text-primary h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="text-primary text-[9px] font-semibold tracking-widest">
                      {code}
                    </span>
                    <span className="text-muted-foreground font-display text-[11px] font-semibold tracking-wide uppercase">
                      {label}
                    </span>
                    <span className="text-muted-foreground ml-auto text-[10px]">
                      {questions.length} questions
                    </span>
                  </div>
                  <div className="mt-2 space-y-2.5">
                    {questions.map((q) => (
                      <QuestionCard key={q.question} q={q} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prep plan */}
        <div>
          <ReportHeading icon={ClipboardList}>Prep plan</ReportHeading>
          <ol className="mt-2 space-y-1.5">
            {SAMPLE_REPORT.prepPlan.map((step, i) => (
              <li key={step} className="font-display text-foreground flex gap-2.5 text-[12px]">
                <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Research library */}
        <div>
          <ReportHeading icon={BookOpen}>Research library</ReportHeading>
          <p className="text-muted-foreground font-display mt-1 text-[11px] leading-relaxed">
            Every link the run kept, ranked by how well it matches the target.
          </p>
          <div className="mt-3 space-y-4">
            {kinds.map((kind) => {
              const items = SAMPLE_REPORT.researchResources.filter((r) => r.kind === kind);
              return (
                <div key={kind}>
                  <p className="text-muted-foreground font-display text-[11px] font-semibold tracking-wide uppercase">
                    {RESOURCE_KIND_LABEL[kind]} ({items.length})
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {items.map((r) => (
                      <li
                        key={r.url}
                        className="border-border bg-background rounded-md border px-2.5 py-1.5">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <Link2 className="text-primary h-3 w-3 shrink-0" aria-hidden="true" />
                          <span className="font-display text-foreground min-w-0 truncate text-[11px] font-medium">
                            {r.title}
                          </span>
                        </div>
                        <div className="text-muted-foreground mt-0.5 flex items-center justify-between gap-2 text-[9px]">
                          <span className="truncate">{hostOf(r.url)}</span>
                          <span className="text-primary shrink-0">{ACCESS_LABEL[r.access]}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function PrepPanel() {
  /* Drawn from the report's own questions, strongest evidence first, so the
     checklist is the same 20 questions the Report stage just showed. */
  const items = [
    { q: "Longest cycle in an undirected graph", tag: "High", done: true },
    { q: "3D router grid · connected components with DSU", tag: "High", done: true },
    { q: "Expression calculator with custom precedence", tag: "High", done: false },
    { q: "Build targets · cycle detection and topological sort", tag: "High", done: false },
    { q: "Priority queue manager with O(log N) updates", tag: "High", done: false },
    { q: "Design a distributed in-memory cache", tag: "High", done: false },
    { q: "Design a personalized feed · push vs pull fan-out", tag: "High", done: false },
    { q: "Design an async job execution queue", tag: "High", done: false },
    { q: "Design a logs and metrics ingestion pipeline", tag: "Medium", done: false },
    { q: "Design routing and traffic estimation like Maps", tag: "Medium", done: false },
  ];
  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-5">
      <div>
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
            <span
              className={`ml-auto shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] tracking-wide uppercase ${
                it.tag === "High"
                  ? "text-status-good border-status-good/30 bg-status-good/10"
                  : "text-status-warning border-status-warning/30 bg-status-warning/10"
              }`}>
              {it.tag}
            </span>
          </li>
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
