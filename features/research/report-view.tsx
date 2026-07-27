"use client";

import { useEffect, useRef, useState } from "react";

import {
  AlertTriangle,
  BookOpen,
  Building2,
  Check,
  ChevronDown,
  ClipboardCopy,
  ClipboardList,
  Coins,
  Compass,
  Download,
  FileJson,
  FileText,
  HelpCircle,
  LayoutList,
  Lightbulb,
  Link as LinkIcon,
  Loader2,
  MessagesSquare,
  Mic,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  Wrench,
  Zap,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import type { Effort } from "@/lib/research/budget";
import {
  BASELINE_BASIS_META,
  BASIS_META,
  CONFIDENCE_META,
  RECONSTRUCTED_BASIS_META,
  RESOURCE_ACCESS_META,
  RESOURCE_KIND_META,
  RESOURCE_RELEVANCE_META,
  SECTION_META,
  categoryCode,
  categoryLabel,
  groupByCategory,
  missingSections,
} from "@/lib/research/display";
import { downloadBlob, reportSlug } from "@/lib/research/download";
import { estimateExtend } from "@/lib/research/estimate";
import { buildAnswerPrompt, buildMockInterviewPrompt } from "@/lib/research/prompt";
import {
  type ImportantLink,
  RESOURCE_KINDS,
  type Report,
  type ReportSection,
  type ResearchResource,
} from "@/lib/research/types";

import { EffortPicker } from "@/features/research/effort-picker";
import { EstimatePanel } from "@/features/research/estimate-panel";
import { RoundPicker, categoryIcon } from "@/features/research/round-picker";
import { SectionPicker } from "@/features/research/section-picker";
import { explainError, streamSse } from "@/features/research/stream";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground text-[11px] tracking-[0.18em] uppercase">
      {children}
    </span>
  );
}

/**
 * One vertical rhythm for the whole report. The page is a long stack of unlike
 * blocks — prose, chips, cards, lists — and without a single shared scale it
 * reads as one undifferentiated wall.
 *
 * `SECTION` is the gap between top-level sections; `HEADING_GAP` sits between a
 * heading and the content it introduces. The section gap has to be clearly
 * larger than the heading gap, or a heading appears to belong to the section
 * above it as much as its own.
 */
const SECTION = "mt-14";
const HEADING_GAP = "mt-5";

/**
 * Headings are grey and the body is near-black, which is the whole point: at a
 * glance the dark text is what you read, and the grey is scaffolding telling you
 * where you are.
 */
const SECTION_HEADING = "font-display text-muted-foreground text-lg font-semibold tracking-tight";

/** A heading's own explanatory line — stays tight to the heading it belongs to. */
const HEADING_SUB = "text-muted-foreground font-display mt-1.5 text-xs";

type NewContent = {
  questions: Set<string>;
  categories: Set<string>;
  sections: Set<string>;
  skills: Set<string>;
  resources: Set<string>;
  interviewExperiences: Set<string>;
  importantLinks: Set<string>;
};

function emptyNewContent(): NewContent {
  return {
    questions: new Set(),
    categories: new Set(),
    sections: new Set(),
    skills: new Set(),
    resources: new Set(),
    interviewExperiences: new Set(),
    importantLinks: new Set(),
  };
}

function questionKey(question: Report["questions"][number]): string {
  return `${question.category}\u0000${question.question}`;
}

function skillKey(skill: NonNullable<Report["skillsRequired"]>[number]): string {
  return `${skill.skill}\u0000${skill.why}`;
}

function resourcesForRound(resources: ResearchResource[], category: string) {
  return resources
    .filter((resource) => resource.categories?.includes(category))
    .sort(
      (a, b) =>
        RESOURCE_RELEVANCE_META[b.relevanceTier ?? "general"].order -
        RESOURCE_RELEVANCE_META[a.relevanceTier ?? "general"].order
    );
}

/** The transient delta between what was visible and one extension response. */
function findNewContent(before: Report, after: Report): NewContent {
  const next = emptyNewContent();
  const beforeQuestions = new Set(before.questions.map(questionKey));
  const beforeCategories = new Set(before.questions.map((question) => question.category));
  const beforeSkills = new Set((before.skillsRequired ?? []).map(skillKey));
  const beforeResources = new Set((before.researchResources ?? []).map((item) => item.url));
  const beforeExperiences = new Set((before.interviewExperiences ?? []).map((item) => item.url));
  const beforeImportantLinks = new Set((before.importantLinks ?? []).map((item) => item.url));

  for (const question of after.questions) {
    if (!beforeQuestions.has(questionKey(question))) next.questions.add(questionKey(question));
    if (!beforeCategories.has(question.category)) next.categories.add(question.category);
  }
  for (const skill of after.skillsRequired ?? []) {
    if (!beforeSkills.has(skillKey(skill))) next.skills.add(skillKey(skill));
  }
  for (const resource of after.researchResources ?? []) {
    if (!beforeResources.has(resource.url)) next.resources.add(resource.url);
  }
  for (const experience of after.interviewExperiences ?? []) {
    if (!beforeExperiences.has(experience.url)) next.interviewExperiences.add(experience.url);
  }
  for (const link of after.importantLinks ?? []) {
    if (!beforeImportantLinks.has(link.url)) next.importantLinks.add(link.url);
  }

  if (!before.companySnapshot && after.companySnapshot) next.sections.add("company");
  if (!before.likelyLoopStructure && after.likelyLoopStructure) next.sections.add("loop");
  if (before.skillsRequired == null && after.skillsRequired != null) next.sections.add("skills");
  if (before.recruiterPitch == null && after.recruiterPitch != null) {
    next.sections.add("recruiter");
  }
  if (
    (before.interviewExperiences == null || (before.interviewExperiences?.length ?? 0) === 0) &&
    (after.interviewExperiences?.length ?? 0) > 0
  ) {
    next.sections.add("experiences");
  }
  if ((before.researchResources?.length ?? 0) === 0 && (after.researchResources?.length ?? 0) > 0) {
    next.sections.add("researchResources");
  }
  if ((before.importantLinks?.length ?? 0) === 0 && (after.importantLinks?.length ?? 0) > 0) {
    next.sections.add("importantLinks");
  }

  return next;
}

/** The repo's `--ease-out-strong`, as the tuple Motion wants. */
const EASE_OUT_STRONG = [0.23, 1, 0.32, 1] as const;

/**
 * The `New` badge marks the delta an extension just bought — `findNewContent`
 * exists solely to compute it, and it used to land with no motion at all, which
 * left the one piece of feedback for a paid action indistinguishable from
 * content that had always been there.
 *
 * `index` staggers a group; it is capped by the caller, because a 20-question
 * extension cascading at 40ms a piece would run for most of a second.
 */
function NewBadge({ index = 0 }: { index?: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.span
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "scale(0.95)" }}
      animate={{ opacity: 1, transform: "scale(1)" }}
      transition={{
        duration: 0.2,
        ease: EASE_OUT_STRONG,
        delay: reduceMotion ? 0 : index * STAGGER_STEP_S,
      }}
      className="inline-flex">
      <Badge className="bg-primary text-primary-foreground h-4 px-1.5 text-[9px] font-semibold tracking-wide uppercase">
        New
      </Badge>
    </motion.span>
  );
}

/** 40ms between badges in a group, and never more than this many staggered. */
const STAGGER_STEP_S = 0.04;
const STAGGER_CAP = 6;

/** Position in the stagger, flattened once past the cap so nothing waits long. */
function staggerIndex(position: number): number {
  return Math.min(position, STAGGER_CAP);
}

export function ReportView({
  report,
  costUsd,
  creditsCharged,
  company,
  onReset,
  researchId,
  extendCredits,
  balance,
  roleContext,
}: {
  report: Report;
  costUsd: number | null;
  creditsCharged: number | null;
  company: string;
  onReset?: () => void;
  /** Enables the extend controls. Absent for a report not yet persisted. */
  researchId?: string;
  /** Per-effort credit ceiling for an extension; omitted until the balance loads. */
  extendCredits?: Record<Effort, number>;
  /** What the user holds, for the extend estimate's ring. Omitted until it loads. */
  balance?: number;
  /** The role the candidate is interviewing for, woven into the copy prompts. */
  roleContext?: string;
}) {
  // An extend run returns a merged report, so what's rendered has to be able to
  // outgrow the prop. Re-sync during render (not in an effect) whenever the
  // parent hands us a different report — React's adjust-state-on-prop-change idiom.
  const [current, setCurrent] = useState(report);
  const [seededFrom, setSeededFrom] = useState(report);
  const [newContent, setNewContent] = useState<NewContent>(emptyNewContent);
  const [currentBalance, setCurrentBalance] = useState(balance);
  if (seededFrom !== report) {
    setSeededFrom(report);
    setCurrent(report);
    setNewContent(emptyNewContent());
  }
  if (currentBalance !== balance && balance !== undefined) {
    setCurrentBalance(balance);
  }

  // Which extend request is in flight: a category slug for a "More" click, or
  // the sentinel "__rounds__" for the footer form. Only one runs at a time.
  const [busy, setBusy] = useState<string | null>(null);
  // The extension awaiting confirmation, in the same shape `extend` takes. Both
  // entry points — "More" and "Gather these rounds" — spend credits, so neither
  // calls `extend` directly; they park the request here.
  const [confirm, setConfirm] = useState<{
    rounds: string[];
    sections: ReportSection[];
    token: string;
  } | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [extendError, setExtendError] = useState<string | null>(null);
  const [extraRounds, setExtraRounds] = useState<string[]>([]);
  // Sections the finished report is missing that the user has chosen to gather in.
  const [extraSections, setExtraSections] = useState<ReportSection[]>([]);
  // How hard every extension (both "More" and "Gather these rounds") searches.
  const [effort, setEffort] = useState<Effort>("medium");

  // "copied" reverts on a timer; "failed" covers a denied clipboard permission.
  // These drive the header button. Per-round menus flip their own icon via
  // copiedCat, which holds the category slug just copied.
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [copiedCat, setCopiedCat] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const catCopyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The PDF renderer is code-split, so a slow network can leave a visible gap
  // between the click and the file appearing. Disable the trigger meanwhile.
  const [pdfBusy, setPdfBusy] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const reduceMotion = useReducedMotion();
  /** Icon and label share one recipe so the two halves can never drift apart. */
  const copyIn = {
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(2px)" },
    animate: { opacity: 1, filter: "blur(0px)" },
    transition: { duration: 0.14, ease: EASE_OUT_STRONG },
  };

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
      if (catCopyTimer.current) clearTimeout(catCopyTimer.current);
    },
    []
  );

  function downloadJson() {
    const blob = new Blob([JSON.stringify(current, null, 2)], { type: "application/json" });
    downloadBlob(blob, `gathered-resources-${reportSlug(company)}.json`);
  }

  async function downloadPdf() {
    if (pdfBusy) return;
    setPdfBusy(true);
    setDownloadError(null);
    try {
      // jsPDF is ~150 KB; only a user who asks for a PDF pays to load it.
      const { buildReportPdf } = await import("@/lib/research/pdf");
      downloadBlob(
        await buildReportPdf(current, company),
        `gathered-resources-${reportSlug(company)}.pdf`
      );
    } catch {
      setDownloadError("Could not build the PDF. Try again.");
    } finally {
      setPdfBusy(false);
    }
  }

  async function copyPrompt(text: string) {
    if (copyTimer.current) clearTimeout(copyTimer.current);
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    copyTimer.current = setTimeout(() => setCopyState("idle"), 2000);
  }

  // Per-round copy: flip the round's icon to a check for a beat. A clipboard
  // failure here just leaves the icon unchanged — the header button is the
  // primary, feedback-rich path.
  async function copyRoundPrompt(cat: string, text: string) {
    if (catCopyTimer.current) clearTimeout(catCopyTimer.current);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCat(cat);
      catCopyTimer.current = setTimeout(() => setCopiedCat(null), 2000);
    } catch {
      setCopiedCat(null);
    }
  }

  async function extend(interviewTypes: string[], sections: ReportSection[], token: string) {
    if (!researchId || busy) return;
    setBusy(token);
    setProgress(null);
    setExtendError(null);

    try {
      const res = await fetch(`/api/research/${researchId}/extend`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ interviewTypes, sections, effort }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(explainError(res.status, body));
      }

      await streamSse(res.body, (msg) => {
        if (msg.kind === "progress") {
          setProgress(String(msg.message ?? ""));
        } else if (msg.kind === "report") {
          const merged = msg.report as Report;
          setNewContent(findNewContent(current, merged));
          setCurrent(merged);
          setExtraRounds([]);
          setExtraSections([]);
          if (typeof msg.balanceAfter === "number") setCurrentBalance(msg.balanceAfter);
        } else if (msg.kind === "error") {
          setExtendError(String(msg.message ?? "Extend failed."));
        }
      });
    } catch (err) {
      setExtendError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  // The sections this finished report never got — the ones "Report Sections"
  // offers to gather in. Re-derived each render so an extension that fills one
  // drops it from the card.
  const missing = missingSections(current);

  // Priced for whatever the footer's pickers hold: each round and each added
  // section is a unit of research. An empty selection prices a single unit,
  // which is also what one "More" button up in the report costs.
  const extendEstimate = extendCredits
    ? estimateExtend(
        Math.max(extraRounds.length + extraSections.length, 1),
        effort,
        extendCredits[effort]
      )
    : null;

  // The same pricing, for whatever the confirmation is holding — one round for a
  // "More" click, the whole selection for the footer button.
  const confirmEstimate =
    confirm && extendCredits
      ? estimateExtend(
          Math.max(confirm.rounds.length + confirm.sections.length, 1),
          effort,
          extendCredits[effort]
        )
      : null;

  const grouped = groupByCategory(current.questions);
  // The rounds already covered, which "Gather more rounds" must not offer again.
  const order = grouped.map((g) => g.cat);

  // Null when the run excluded the section, absent when the report predates it.
  const importantLinks = current.importantLinks ?? [];
  const interviewExperiences = current.interviewExperiences ?? [];
  const skillsRequired = current.skillsRequired ?? [];
  const researchResources = current.researchResources ?? [];

  return (
    // The estimate rail is absolutely placed at `left-full` + `ml-5`, so it sits
    // 15.25rem (w-56 + ml-5) beyond this box's right edge. Reserving exactly that
    // much margin from xl — where the rail appears — is what keeps it on the page
    // instead of pushing the document sideways. Applied here rather than at the
    // page so every ReportView (standalone route and post-run in the form) is safe.
    <div className="relative mt-6 xl:mr-[15.25rem]">
      <div className="flex items-center justify-between pb-3">
        <SectionLabel>
          <Search className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
          Gathered resources
        </SectionLabel>
        <div className="flex items-center gap-2">
          {creditsCharged != null && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    data-testid="credits-badge"
                    // No tracking-widest: this is a number, and letter-spacing on
                    // digits makes them read as separate figures.
                    className="bg-primary/10 border-primary/20 text-primary mr-1 inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums">
                    <Coins className="size-3.5" />
                    {creditsCharged.toLocaleString()}
                  </span>
                }
              />
              <TooltipContent>
                {creditsCharged.toLocaleString()} credits
                {costUsd != null && ` · $${costUsd.toFixed(4)} metered`}
              </TooltipContent>
            </Tooltip>
          )}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    render={
                      // Glossy at rest, but a failure has to drop out of it —
                      // "Copy failed" in white on a blue gradient reads as a
                      // success, which is the opposite of what happened.
                      <Button
                        type="button"
                        variant={copyState === "failed" ? "outline" : "glossy"}
                        size="sm"
                        aria-label="Copy as prompt"
                        // min-w reserves the widest label ("Copy as Prompt") so
                        // the button cannot resize when it swaps to "Copied" —
                        // it used to change width at the exact moment the user
                        // is looking straight at it, which also shoved the
                        // Download button beside it sideways.
                        className={`min-w-[10.5rem] ${
                          copyState === "failed"
                            ? "border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive shadow-[var(--shadow-xs)]"
                            : ""
                        }`}
                      />
                    }
                  />
                }>
                {/* Inherits the button's colour rather than going green: the
                    copied state sits on the glossy blue fill, where a
                    status-good tick would barely register.

                    Icon and label are keyed on the state so each swap replays a
                    short blur-in. Blur is what stops the two labels reading as
                    two separate objects trading places — it bridges them into
                    one word changing. Only the incoming half animates: the
                    outgoing one is gone, which keeps a single label in the DOM
                    and the state genuinely assertable. */}
                <motion.span
                  key={`${copyState}-icon`}
                  initial={copyIn.initial}
                  animate={copyIn.animate}
                  transition={copyIn.transition}
                  className="mr-1 inline-flex">
                  {copyState === "copied" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <ClipboardCopy className="h-4 w-4" />
                  )}
                </motion.span>
                <motion.span
                  key={copyState}
                  initial={copyIn.initial}
                  animate={copyIn.animate}
                  transition={copyIn.transition}
                  className="font-display">
                  {copyState === "copied"
                    ? "Copied"
                    : copyState === "failed"
                      ? "Copy failed"
                      : "Copy as Prompt"}
                </motion.span>
                <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-60" />
              </TooltipTrigger>
              <TooltipContent>
                Copy the report as a prompt for ChatGPT or any assistant — get every question
                answered, or run a mock interview
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem
                onClick={() =>
                  copyPrompt(buildAnswerPrompt(current, company, undefined, roleContext))
                }>
                <ClipboardCopy className="mr-1" />
                <span className="font-display">Get every question answered</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  copyPrompt(buildMockInterviewPrompt(current, company, undefined, roleContext))
                }>
                <ClipboardCopy className="mr-1" />
                <span className="font-display">Mock interview — full loop</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button type="button" variant="glossy" size="sm" aria-label="Download" />}>
              {pdfBusy ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1 h-4 w-4" />
              )}
              <span className="font-display">Download</span>
              <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem disabled={pdfBusy} onClick={downloadPdf}>
                <FileText className="mr-1" />
                <span className="font-display">PDF</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadJson}>
                <FileJson className="mr-1" />
                <span className="font-display">JSON</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {onReset && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="shadow-[var(--shadow-xs)]">
              <span className="font-display">New report</span>
            </Button>
          )}
        </div>
      </div>
      {/* A failed export used to be an 11px grey-red line hugging the right
          margin — easy to miss entirely. Given the same boxed treatment as the
          report's other warnings. */}
      {downloadError && (
        <p className="text-destructive bg-destructive/10 border-destructive/30 font-display mb-2 flex items-start gap-1.5 rounded-lg border px-3 py-2 text-xs leading-relaxed">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{downloadError}</span>
        </p>
      )}
      <Separator />

      {/* Legacy and well-documented reports leave this unset or rich. */}
      {current.evidenceCoverage === "sparse" && (
        <div className="bg-primary/5 border-primary/40 mt-5 rounded-md border-l-2 px-4 py-3">
          <SectionLabel>
            <AlertTriangle className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
            Limited public data
          </SectionLabel>
          <p className="font-display text-foreground mt-1.5 text-[13.5px] leading-relaxed">
            First-hand evidence is limited for one or more rounds. Inferred questions use the job
            description, company engineering signals, and comparable companies where relevant; look
            for the <span className="font-semibold">Inferred</span> tag.
          </p>
        </div>
      )}

      {/* Null once the section can be switched off at request time. */}
      {current.companySnapshot && (
        <section className={SECTION}>
          <div className="flex items-center gap-2">
            <h2 className={SECTION_HEADING}>
              <Building2 className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
              The company
            </h2>
            {newContent.sections.has("company") && <NewBadge />}
          </div>
          <p className={`font-display text-foreground text-[15px] leading-relaxed ${HEADING_GAP}`}>
            {current.companySnapshot}
          </p>
          {/* Reports generated before companyExplainer existed are stored without it. */}
          {current.companyExplainer && (
            <div className="bg-primary/10 border-primary/40 mt-3 rounded-md border-l-2 px-4 py-3">
              <SectionLabel>
                <Lightbulb className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                In plain terms
              </SectionLabel>
              <p className="font-display text-foreground mt-1.5 text-[15px] leading-relaxed">
                {current.companyExplainer}
              </p>
            </div>
          )}
        </section>
      )}

      {current.likelyLoopStructure && (
        <section className={SECTION}>
          <div className="flex items-center gap-2">
            <SectionLabel>
              <Compass className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
              The loop
            </SectionLabel>
            {newContent.sections.has("loop") && <NewBadge />}
          </div>
          <p className="font-display border-primary text-foreground mt-2 border-l-2 pl-3 text-[15px] leading-relaxed">
            {current.likelyLoopStructure}
          </p>
        </section>
      )}

      {current.interviewerSummary && (
        <Card className={SECTION}>
          <CardContent>
            <SectionLabel>
              <Mic className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
              The interviewer
            </SectionLabel>
            <p className="font-display text-foreground mt-1.5 text-[15px] leading-relaxed">
              {current.interviewerSummary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Null on a report that excluded the section, absent on one generated
          before it existed — either way there is nothing to show. */}
      {skillsRequired.length > 0 && (
        <section className={SECTION}>
          <div className="flex items-center gap-2">
            <h2 className={SECTION_HEADING}>
              <Wrench className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
              Skills required
            </h2>
            {newContent.sections.has("skills") && <NewBadge />}
          </div>
          <p className={HEADING_SUB}>
            What the role actually demands — including what the job post leaves unsaid. Hover a
            skill for why it matters here.
          </p>
          <div className={`flex flex-wrap gap-2 ${HEADING_GAP}`}>
            {skillsRequired.map((s, i) => (
              <span key={i} className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Badge
                        variant="outline"
                        className="hover:border-primary/50 hover:bg-primary/10 hover:text-primary cursor-help px-2.5 py-1 transition-colors"
                      />
                    }>
                    <span className="font-display text-[13px]">{s.skill}</span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <span className="font-display">{s.why}</span>
                  </TooltipContent>
                </Tooltip>
                {newContent.skills.has(skillKey(s)) && <NewBadge />}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Null on a report that declined the section, absent on one generated
          before it existed — either way there is nothing to show. */}
      {current.recruiterPitch && (
        <section className={SECTION}>
          <div className="flex items-center gap-2">
            <h2 className={SECTION_HEADING}>
              <UserCheck className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
              How to impress the recruiter
            </h2>
            {newContent.sections.has("recruiter") && <NewBadge />}
          </div>
          <p className={`font-display text-foreground text-[15px] leading-relaxed ${HEADING_GAP}`}>
            {current.recruiterPitch.candidateProfile}
          </p>
          <ul className="mt-3 space-y-1.5">
            {current.recruiterPitch.presentationTips.map((tip, i) => (
              <li key={i} className="font-display text-foreground flex gap-3 text-[15px]">
                <span className="text-primary text-[13px]" aria-hidden="true">
                  →
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={SECTION}>
        <h2 className={SECTION_HEADING}>
          <HelpCircle className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
          Pinpointed questions
        </h2>
        <div className={`space-y-8 ${HEADING_GAP}`}>
          {grouped.map(({ cat, questions }) => {
            const CategoryIcon = categoryIcon(cat);
            // Where each newly gathered question sits in this round's stagger.
            // Built up front so the render below stays a pure map, and counted
            // per round rather than across the whole report — otherwise a round
            // near the bottom would still be arriving long after the user
            // scrolled to it.
            const newOrder = new Map<string, number>();
            for (const question of questions) {
              const key = questionKey(question);
              if (newContent.questions.has(key)) newOrder.set(key, newOrder.size);
            }
            return (
              <div key={cat}>
                <div className="flex items-baseline gap-2">
                  <CategoryIcon className="text-primary h-3.5 w-3.5" aria-hidden="true" />
                  <span className="text-primary text-[10px] font-semibold tracking-widest">
                    {categoryCode(cat)}
                  </span>
                  {/* Muted like the section heading above it. Left near-black it
                      out-ranked its own parent, since it is uppercase and bold. */}
                  <h3 className="font-display text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                    {categoryLabel(cat)}
                  </h3>
                  {current.evidenceCoverageByCategory?.[cat] === "sparse" && (
                    <Badge variant="outline" className="text-muted-foreground text-[10px]">
                      Limited evidence
                    </Badge>
                  )}
                  {newContent.categories.has(cat) && <NewBadge />}
                  <div className="ml-auto flex items-center gap-2">
                    {researchId && busy === cat && progress && (
                      <span className="text-muted-foreground hidden max-w-[16rem] truncate text-[11px] sm:inline">
                        {progress}
                      </span>
                    )}
                    {/* Copying is free and client-side, so it stays available on
                      the public share page (unlike "More", which spends credits). */}
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  aria-label={`Copy ${categoryLabel(cat)} as prompt`}
                                  className="h-7 shrink-0 px-2"
                                />
                              }
                            />
                          }>
                          {copiedCat === cat ? (
                            <Check className="text-primary h-3.5 w-3.5" />
                          ) : (
                            <ClipboardCopy className="h-3.5 w-3.5" />
                          )}
                          <ChevronDown className="ml-0.5 h-3 w-3 opacity-60" />
                        </TooltipTrigger>
                        <TooltipContent>Copy just this round as a prompt</TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem
                          onClick={() =>
                            copyRoundPrompt(
                              cat,
                              buildAnswerPrompt(current, company, [cat], roleContext)
                            )
                          }>
                          <ClipboardCopy className="mr-1" />
                          <span className="font-display">Copy answers prompt</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            copyRoundPrompt(
                              cat,
                              buildMockInterviewPrompt(current, company, [cat], roleContext)
                            )
                          }>
                          <ClipboardCopy className="mr-1" />
                          <span className="font-display">Copy mock interview</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {researchId && (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              type="button"
                              variant="glossy"
                              size="sm"
                              aria-label={`Add more ${categoryLabel(cat)} questions`}
                              className="h-7 shrink-0 px-2.5"
                              disabled={busy !== null}
                              onClick={() =>
                                setConfirm({ rounds: [cat], sections: [], token: cat })
                              }
                            />
                          }>
                          {/* Icons inherit the glossy variant's white text. */}
                          {busy === cat ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                          <span className="font-display ml-1 text-xs">More</span>
                        </TooltipTrigger>
                        <TooltipContent>Add more questions</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
                <ul className="mt-2 space-y-3">
                  {questions.map((q, i) => {
                    // Keyed by identity rather than index: an extension merges new
                    // questions into the existing list, and an index key would let
                    // React reuse a settled card for a new one — the entrance would
                    // then play on the wrong question.
                    const key = questionKey(q);
                    const newIndex = newOrder.get(key);
                    const basisMeta =
                      q.basis === "reconstructed"
                        ? RECONSTRUCTED_BASIS_META
                        : q.basis === "inferred"
                          ? BASIS_META
                          : q.basis === "baseline"
                            ? BASELINE_BASIS_META
                            : null;
                    return (
                      <motion.li
                        key={key}
                        // `false` means "no entrance": questions that were already
                        // on screen must not replay anything when a sibling arrives.
                        initial={
                          newIndex === undefined || reduceMotion
                            ? false
                            : { opacity: 0, transform: "translateY(6px)" }
                        }
                        animate={
                          newIndex === undefined
                            ? undefined
                            : { opacity: 1, transform: "translateY(0px)" }
                        }
                        transition={{
                          duration: 0.24,
                          ease: EASE_OUT_STRONG,
                          delay: staggerIndex(newIndex ?? 0) * STAGGER_STEP_S,
                        }}>
                        <Card>
                          <CardContent>
                            <div className="flex items-start justify-between gap-3">
                              <p className="font-display text-foreground text-[15px] leading-snug font-medium">
                                {q.question}
                              </p>
                              <div className="flex shrink-0 items-center gap-2">
                                {newIndex !== undefined && (
                                  <NewBadge index={staggerIndex(newIndex)} />
                                )}
                                {basisMeta && (
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={
                                        <Badge
                                          variant="outline"
                                          className="text-muted-foreground cursor-default text-[10px]">
                                          {basisMeta.label}
                                        </Badge>
                                      }
                                    />
                                    <TooltipContent className="max-w-xs">
                                      {basisMeta.tooltip}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                <span
                                  className={`text-[13px] leading-none ${
                                    q.confidence === "low"
                                      ? "text-muted-foreground"
                                      : "text-primary"
                                  }`}
                                  title={`Confidence: ${CONFIDENCE_META[q.confidence].label}`}>
                                  {CONFIDENCE_META[q.confidence].signal}
                                </span>
                              </div>
                            </div>
                            <p className="font-display text-muted-foreground mt-2 text-[13.5px] leading-relaxed">
                              {q.rationale}
                            </p>
                            <details className="mt-2">
                              <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-[11px] tracking-widest uppercase">
                                Prep note
                              </summary>
                              <p className="font-display text-foreground mt-1.5 text-[13.5px] leading-relaxed">
                                {q.prepNote}
                              </p>
                            </details>
                            {q.evidenceUrls.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {q.evidenceUrls.map((url, j) => (
                                  <Badge
                                    key={j}
                                    variant="outline"
                                    className="hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-colors"
                                    render={
                                      <a href={url} target="_blank" rel="noopener noreferrer" />
                                    }>
                                    <LinkIcon className="h-3 w-3" aria-hidden="true" />
                                    <span className="text-[10px]">{hostOf(url)}</span>
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.li>
                    );
                  })}
                </ul>
                <RoundResources
                  resources={resourcesForRound(researchResources, cat)}
                  newUrls={newContent.resources}
                />
              </div>
            );
          })}
        </div>
        {extendError && <p className="text-destructive mt-3 text-[11px]">{extendError}</p>}
      </section>

      {current.prepPlan.length > 0 && (
        <section className={SECTION}>
          <Separator className="mb-5" />
          <h2 className={SECTION_HEADING}>
            <ClipboardList className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
            Prep plan
          </h2>
          <ol className={`space-y-2 ${HEADING_GAP}`}>
            {current.prepPlan.map((step, i) => (
              <li key={i} className="font-display text-foreground flex gap-3 text-[15px]">
                <span className="text-muted-foreground text-[13px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-display">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {researchResources.length > 0 && (
        <section className={SECTION}>
          <Separator className="mb-5" />
          <div className="flex items-center gap-2">
            <h2 className={SECTION_HEADING}>
              <BookOpen className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
              Research library
            </h2>
            {newContent.sections.has("researchResources") && <NewBadge />}
          </div>
          <p className={HEADING_SUB}>
            Discovery links are kept separate from question evidence. “Open manually” means we found
            the link but could not reliably read it, so it was not used as evidence.
          </p>
          <ResourceLibrary resources={researchResources} newUrls={newContent.resources} />
        </section>
      )}

      {researchResources.length === 0 && interviewExperiences.length > 0 && (
        <section className={SECTION}>
          <Separator className="mb-5" />
          <div className="flex items-center gap-2">
            <h2 className={SECTION_HEADING}>
              <MessagesSquare className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
              Interview experiences
            </h2>
            {newContent.sections.has("experiences") && <NewBadge />}
          </div>
          <p className={HEADING_SUB}>First-hand accounts from people who interviewed here.</p>
          <LinkCards links={interviewExperiences} newUrls={newContent.interviewExperiences} />
        </section>
      )}

      {researchResources.length === 0 && importantLinks.length > 0 && (
        <section className={SECTION}>
          <Separator className="mb-5" />
          <div className="flex items-center gap-2">
            <h2 className={SECTION_HEADING}>
              <BookOpen className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
              Worth reading
            </h2>
            {newContent.sections.has("importantLinks") && <NewBadge />}
          </div>
          <LinkCards links={importantLinks} newUrls={newContent.importantLinks} />
        </section>
      )}

      {researchId && (
        <section className={SECTION}>
          <Separator className="mb-5" />
          <h2 className={SECTION_HEADING}>
            <RefreshCw className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
            Keep on Generating
          </h2>

          {/* Sections the original run skipped can still be gathered in. Only
              shown when something is actually missing; the "Gather these rounds"
              button below sends whatever is picked here alongside the rounds. */}
          {missing.length > 0 && (
            <Card className="mt-4">
              <CardContent>
                <h2 className="text-muted-foreground font-display flex items-center text-lg font-medium capitalize">
                  <LayoutList className="text-primary mr-2.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  Report Sections
                </h2>
                <p className={HEADING_SUB}>
                  This report skipped these. Pick any you want and we&apos;ll research them into it.
                </p>
                <div className="mt-4">
                  <SectionPicker
                    selected={extraSections}
                    options={missing}
                    disabled={busy !== null}
                    onToggle={(section) =>
                      setExtraSections((prev) =>
                        prev.includes(section)
                          ? prev.filter((s) => s !== section)
                          : [...prev, section]
                      )
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mt-4">
            <CardContent>
              <h2 className="text-muted-foreground font-display flex items-center text-lg font-medium capitalize">
                <Search className="text-primary mr-2.5 h-5 w-5 shrink-0" aria-hidden="true" />
                Gather more rounds
              </h2>
              <p className={HEADING_SUB}>
                Forgot a round? Pick or create one and we&apos;ll research it into this report.
              </p>
              <div className="mt-4">
                <RoundPicker
                  selected={extraRounds}
                  exclude={order}
                  disabled={busy !== null}
                  onToggle={(cat) =>
                    setExtraRounds((prev) =>
                      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
                    )
                  }
                  onAddCustom={(round) =>
                    setExtraRounds((prev) =>
                      // A round the report already covers belongs to "More", not here.
                      prev.includes(round) || order.includes(round) ? prev : [...prev, round]
                    )
                  }
                  onRemoveCustom={(round) =>
                    setExtraRounds((prev) => prev.filter((c) => c !== round))
                  }
                />
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-muted-foreground truncate text-[11px]">
                  {busy === "__rounds__" ? (progress ?? "Starting…") : ""}
                </span>
                <Button
                  type="button"
                  size="lg"
                  variant="glossy"
                  disabled={
                    (extraRounds.length === 0 && extraSections.length === 0) || busy !== null
                  }
                  onClick={() =>
                    setConfirm({
                      rounds: extraRounds,
                      sections: extraSections,
                      token: "__rounds__",
                    })
                  }>
                  {busy === "__rounds__" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  Gather these rounds{" "}
                  <RefreshCw className="ml-1 inline size-4" aria-hidden="true" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* The effort + cost for an extension follow the reader down the report: a
          sticky rail in the right margin on wide screens, a bottom bar below.
          The Effort picker rides along so any "More" click — wherever it is on
          the page — shows the effort and price it will run at. */}
      {researchId && extendEstimate && extendCredits && (
        <EstimatePanel
          estimate={extendEstimate}
          balance={currentBalance}
          ceiling={extendCredits[effort]}
          controls={
            <div>
              <h2 className="text-muted-foreground font-display flex items-center text-lg font-medium capitalize">
                <Zap className="text-primary mr-2.5 h-5 w-5 shrink-0" aria-hidden="true" />
                Effort
              </h2>
              <p className={HEADING_SUB}>
                How wide to search. Higher effort finds more questions and costs more credits.
              </p>
              <div className="mt-3">
                <EffortPicker
                  value={effort}
                  onChange={setEffort}
                  credits={extendCredits}
                  disabled={busy !== null}
                  stacked
                />
              </div>
            </div>
          }
        />
      )}

      {/* One dialog for both entry points — they differ only in the rounds they
          ask for, and only one extension can run at a time anyway. */}
      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm && confirm.rounds.length + confirm.sections.length > 1
                ? "Gather these?"
                : "Gather more questions?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm && (
                <>
                  This runs a {effort}-effort extension on{" "}
                  <span className="text-foreground font-medium">{company}</span> for{" "}
                  <span className="text-foreground font-medium">
                    {[
                      ...confirm.rounds.map(categoryLabel),
                      ...confirm.sections.map((s) => SECTION_META[s].label),
                    ].join(", ")}
                  </span>
                  {confirmEstimate && extendCredits ? (
                    <>
                      , using an estimated {confirmEstimate.minCredits}–{confirmEstimate.maxCredits}{" "}
                      credits and capped at {extendCredits[effort]}
                    </>
                  ) : null}
                  . You are charged for what the run actually spends, never the estimate.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="tertiary"
              onClick={() => {
                if (!confirm) return;
                const { rounds, sections, token } = confirm;
                setConfirm(null);
                extend(rounds, sections, token);
              }}>
              Gather
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ResourceLibrary({
  resources,
  newUrls,
}: {
  resources: ResearchResource[];
  newUrls: Set<string>;
}) {
  return (
    <div className="mt-6 space-y-7">
      {RESOURCE_KINDS.map((kind) => {
        const items = resources
          .filter((resource) => resource.kind === kind)
          .sort(
            (a, b) =>
              RESOURCE_RELEVANCE_META[b.relevanceTier ?? "general"].order -
              RESOURCE_RELEVANCE_META[a.relevanceTier ?? "general"].order
          );
        if (items.length === 0) return null;
        return (
          <div key={kind}>
            <h3 className="text-muted-foreground font-display text-sm font-semibold tracking-wide uppercase">
              {RESOURCE_KIND_META[kind].label}
            </h3>
            <ul className="mt-3 space-y-3">
              {items.map((resource) => {
                const access = RESOURCE_ACCESS_META[resource.access];
                const relevance = RESOURCE_RELEVANCE_META[resource.relevanceTier ?? "general"];
                return (
                  <li key={resource.url}>
                    <Card className="hover:ring-primary/30 transition-all hover:shadow-[var(--shadow-md)]">
                      <CardContent>
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                          <span className="flex min-w-0 items-baseline gap-2">
                            <ResourceLinkIcon
                              key={resource.faviconUrl}
                              faviconUrl={resource.faviconUrl}
                            />
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-display text-foreground hover:text-primary text-[15px] leading-snug font-medium underline-offset-4 hover:underline">
                              {resource.title}
                            </a>
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5">
                            <span
                              title={relevance.description}
                              className="text-foreground bg-muted shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium">
                              {relevance.label}
                            </span>
                            <span
                              title={access.description}
                              className="text-primary bg-primary/10 border-primary/20 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium">
                              {access.label}
                            </span>
                          </span>
                          {newUrls.has(resource.url) && <NewBadge />}
                        </div>
                        <p className="font-display text-muted-foreground mt-1.5 text-[13.5px] leading-relaxed">
                          {resource.why}
                        </p>
                        <p className="text-muted-foreground mt-2 text-[10px]">
                          {hostOf(resource.url)}
                        </p>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function RoundResources({
  resources,
  newUrls,
}: {
  resources: ResearchResource[];
  newUrls: Set<string>;
}) {
  if (resources.length === 0) return null;

  return (
    <details className="border-border/70 bg-muted/20 mt-4 rounded-lg border px-4 py-3">
      <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs font-semibold tracking-wide uppercase">
        Other resources ({resources.length})
      </summary>
      <p className="font-display text-muted-foreground mt-2 text-xs leading-relaxed">
        Every relevant link discovered for this round is retained and ranked by target match. “Open
        manually” means the page could not be reliably parsed and was not used as evidence.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {resources.map((resource) => {
          const access = RESOURCE_ACCESS_META[resource.access];
          const relevance = RESOURCE_RELEVANCE_META[resource.relevanceTier ?? "general"];
          return (
            <li key={resource.url} className="bg-background rounded-md border px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <ResourceLinkIcon faviconUrl={resource.faviconUrl} />
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-display text-foreground hover:text-primary min-w-0 truncate text-[13px] font-medium hover:underline">
                  {resource.title}
                </a>
                {newUrls.has(resource.url) && <NewBadge />}
              </div>
              <div className="text-muted-foreground mt-1 flex items-center justify-between gap-2 text-[10px]">
                <span className="truncate">{hostOf(resource.url)}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span title={relevance.description}>{relevance.label}</span>
                  <span className="text-primary" title={access.description}>
                    {access.label}
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

function ResourceLinkIcon({ faviconUrl }: { faviconUrl?: string }) {
  const [failed, setFailed] = useState(false);

  if (!faviconUrl || failed) {
    return <LinkIcon className="text-primary h-4 w-4 shrink-0" aria-hidden="true" />;
  }

  return (
    // Tavily can return icons from any source domain, so this intentionally
    // bypasses Next's fixed remote-image allowlist and loads the cosmetic URL
    // directly in the browser.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={faviconUrl}
      alt=""
      aria-hidden="true"
      width={16}
      height={16}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="h-4 w-4 shrink-0 object-contain"
      onError={() => setFailed(true)}
    />
  );
}

/** The link list shared by "Interview experiences" and "Worth reading". */
function LinkCards({ links, newUrls }: { links: ImportantLink[]; newUrls: Set<string> }) {
  return (
    <ul className="mt-5 space-y-3">
      {links.map((link, i) => (
        <li key={i}>
          {/* These cards exist to be clicked through. The hover lift is the only
              thing that says so — the link itself is the sole hit target. */}
          <Card className="hover:ring-primary/30 transition-all hover:shadow-[var(--shadow-md)]">
            <CardContent>
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-baseline gap-2">
                  <LinkIcon className="text-primary h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-display text-foreground hover:text-primary text-[15px] leading-snug font-medium underline-offset-4 hover:underline">
                    {link.title}
                  </a>
                </span>
                <span className="text-primary bg-primary/10 border-primary/20 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium">
                  {hostOf(link.url)}
                </span>
                {newUrls.has(link.url) && <NewBadge />}
              </div>
              <p className="font-display text-muted-foreground mt-1.5 text-[13.5px] leading-relaxed">
                {link.why}
              </p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}
