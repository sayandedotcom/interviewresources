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
  Lightbulb,
  Link as LinkIcon,
  Loader2,
  MessagesSquare,
  Mic,
  Plus,
  RefreshCw,
  Search,
  Wrench,
  Zap,
} from "lucide-react";

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
  BASIS_META,
  CONFIDENCE_META,
  categoryCode,
  categoryLabel,
  groupByCategory,
} from "@/lib/research/display";
import { downloadBlob, reportSlug } from "@/lib/research/download";
import { estimateExtend } from "@/lib/research/estimate";
import { buildAnswerPrompt, buildMockInterviewPrompt } from "@/lib/research/prompt";
import type { ImportantLink, Report } from "@/lib/research/types";

import { EffortPicker } from "@/features/research/effort-picker";
import { EstimateInline } from "@/features/research/estimate-panel";
import { RoundPicker, categoryIcon } from "@/features/research/round-picker";
import { explainError, streamSse } from "@/features/research/stream";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground font-mono text-[11px] tracking-[0.18em] uppercase">
      {children}
    </span>
  );
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
  if (seededFrom !== report) {
    setSeededFrom(report);
    setCurrent(report);
  }

  // Which extend request is in flight: a category slug for a "More" click, or
  // the sentinel "__rounds__" for the footer form. Only one runs at a time.
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [extendError, setExtendError] = useState<string | null>(null);
  const [extraRounds, setExtraRounds] = useState<string[]>([]);
  // How hard every extension (both "More" and "Scout these rounds") searches.
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

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
      if (catCopyTimer.current) clearTimeout(catCopyTimer.current);
    },
    []
  );

  function downloadJson() {
    const blob = new Blob([JSON.stringify(current, null, 2)], { type: "application/json" });
    downloadBlob(blob, `scouting-report-${reportSlug(company)}.json`);
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
        `scouting-report-${reportSlug(company)}.pdf`
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

  async function extend(interviewTypes: string[], token: string) {
    if (!researchId || busy) return;
    setBusy(token);
    setProgress(null);
    setExtendError(null);

    try {
      const res = await fetch(`/api/research/${researchId}/extend`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ interviewTypes, effort }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(explainError(res.status, body));
      }

      await streamSse(res.body, (msg) => {
        if (msg.kind === "progress") {
          setProgress(String(msg.message ?? ""));
        } else if (msg.kind === "report") {
          setCurrent(msg.report as Report);
          setExtraRounds([]);
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

  // Priced for whatever the footer's picker holds. An empty selection prices a
  // single round, which is also what one "More" button up in the report costs —
  // both run at the same effort.
  const extendEstimate = extendCredits
    ? estimateExtend(Math.max(extraRounds.length, 1), effort, extendCredits[effort])
    : null;

  const grouped = groupByCategory(current.questions);
  // The rounds already covered, which "Scout more rounds" must not offer again.
  const order = grouped.map((g) => g.cat);

  // Null when the run excluded the section, absent when the report predates it.
  const importantLinks = current.importantLinks ?? [];
  const interviewExperiences = current.interviewExperiences ?? [];
  const skillsRequired = current.skillsRequired ?? [];

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between pb-3">
        <SectionLabel>
          <Search className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
          Scouting report
        </SectionLabel>
        <div className="flex items-center gap-4">
          {creditsCharged != null && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    data-testid="credits-badge"
                    className="bg-secondary inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs tracking-widest">
                    <Coins className="text-tertiary size-4" />
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label="Copy as prompt"
                      />
                    }
                  />
                }>
                {copyState === "copied" ? (
                  <Check className="text-tertiary mr-1 h-4 w-4" />
                ) : (
                  <ClipboardCopy className="mr-1 h-4 w-4" />
                )}
                <span className="font-display">
                  {copyState === "copied"
                    ? "Copied"
                    : copyState === "failed"
                      ? "Copy failed"
                      : "Copy as Prompt"}
                </span>
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
              render={<Button type="button" variant="outline" size="sm" aria-label="Download" />}>
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
            <Button variant="outline" size="sm" onClick={onReset}>
              <span className="font-display">New report</span>
            </Button>
          )}
        </div>
      </div>
      {downloadError && (
        <p className="text-destructive pb-2 text-right font-mono text-[11px]">{downloadError}</p>
      )}
      <Separator />

      {/* Only present once the pipeline broadened into proxy research; legacy
          and well-documented reports leave it unset and show nothing. */}
      {current.evidenceCoverage === "sparse" && (
        <div className="bg-primary/5 border-primary/40 mt-5 rounded-md border-l-2 px-4 py-3">
          <SectionLabel>
            <AlertTriangle className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
            Limited public data
          </SectionLabel>
          <p className="font-display text-foreground mt-1.5 text-[13.5px] leading-relaxed">
            There is little first-hand interview data for this company. Some questions are inferred
            from the founders&apos; backgrounds, comparable companies, and stage norms — look for
            the <span className="font-semibold">Inferred</span> tag.
          </p>
        </div>
      )}

      {/* Null once the section can be switched off at request time. */}
      {current.companySnapshot && (
        <section className="mt-5">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            <Building2 className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
            The company
          </h2>
          <p className="font-display text-foreground mt-1.5 text-[15px] leading-relaxed">
            {current.companySnapshot}
          </p>
          {/* Reports generated before companyExplainer existed are stored without it. */}
          {current.companyExplainer && (
            <div className="bg-tertiary/10 border-tertiary/40 mt-3 rounded-md border-l-2 px-4 py-3">
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
        <section className="mt-6">
          <SectionLabel>
            <Compass className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
            The loop
          </SectionLabel>
          <p className="font-display border-primary text-foreground mt-2 border-l-2 pl-3 text-[15px] leading-relaxed">
            {current.likelyLoopStructure}
          </p>
        </section>
      )}

      {current.interviewerSummary && (
        <Card className="mt-6">
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
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            <Wrench className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
            Skills required
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            What the role actually demands — including what the job post leaves unsaid. Hover a
            skill for why it matters here.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {skillsRequired.map((s, i) => (
              <Tooltip key={i}>
                <TooltipTrigger
                  render={
                    <Badge
                      variant="outline"
                      className="hover:border-tertiary/50 hover:bg-tertiary/10 hover:text-tertiary cursor-help px-2.5 py-1 transition-colors"
                    />
                  }>
                  <span className="font-display text-[13px]">{s.skill}</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <span className="font-display">{s.why}</span>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          <HelpCircle className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
          Predicted questions
        </h2>
        <div className="mt-3 space-y-6">
          {grouped.map(({ cat, questions }) => {
            const CategoryIcon = categoryIcon(cat);
            return (
              <div key={cat}>
                <div className="flex items-baseline gap-2">
                  <CategoryIcon className="text-tertiary h-3.5 w-3.5" aria-hidden="true" />
                  <span className="text-tertiary font-mono text-[10px] font-semibold tracking-widest">
                    {categoryCode(cat)}
                  </span>
                  <h3 className="font-display text-sm font-semibold tracking-wide uppercase">
                    {categoryLabel(cat)}
                  </h3>
                  <div className="ml-auto flex items-center gap-2">
                    {researchId && busy === cat && progress && (
                      <span className="text-muted-foreground hidden max-w-[16rem] truncate font-mono text-[11px] sm:inline">
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
                            <Check className="text-tertiary h-3.5 w-3.5" />
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
                              variant="default"
                              size="sm"
                              aria-label={`Add more ${categoryLabel(cat)} questions`}
                              className="bg-tertiary hover:bg-tertiary/90 h-7 shrink-0 px-2 text-black"
                              disabled={busy !== null}
                              onClick={() => extend([cat], cat)}
                            />
                          }>
                          {busy === cat ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-black" />
                          ) : (
                            <Plus className="h-3.5 w-3.5 text-black" />
                          )}
                          <span className="font-display ml-1 text-xs">More</span>
                        </TooltipTrigger>
                        <TooltipContent>Add more questions</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
                <ul className="mt-2 space-y-3">
                  {questions.map((q, i) => (
                    <li key={i}>
                      <Card>
                        <CardContent>
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-display text-foreground text-[15px] leading-snug font-medium">
                              {q.question}
                            </p>
                            <div className="flex shrink-0 items-center gap-2">
                              {q.basis === "inferred" && (
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <Badge
                                        variant="outline"
                                        className="text-muted-foreground cursor-default font-mono text-[10px]">
                                        {BASIS_META.label}
                                      </Badge>
                                    }
                                  />
                                  <TooltipContent className="max-w-xs">
                                    {BASIS_META.tooltip}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              <span
                                className={`font-mono text-[13px] leading-none ${
                                  q.confidence === "low" ? "text-muted-foreground" : "text-primary"
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
                            <summary className="text-muted-foreground hover:text-foreground cursor-pointer font-mono text-[11px] tracking-widest uppercase">
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
                                  className="hover:border-tertiary/50 hover:bg-tertiary/10 hover:text-tertiary transition-colors"
                                  render={
                                    <a href={url} target="_blank" rel="noopener noreferrer" />
                                  }>
                                  <LinkIcon className="h-3 w-3" aria-hidden="true" />
                                  <span className="font-mono text-[10px]">{hostOf(url)}</span>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        {extendError && (
          <p className="text-destructive mt-3 font-mono text-[11px]">{extendError}</p>
        )}
      </section>

      {current.prepPlan.length > 0 && (
        <section className="mt-8">
          <Separator className="mb-5" />
          <h2 className="font-display text-lg font-semibold tracking-tight">
            <ClipboardList className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
            Prep plan
          </h2>
          <ol className="mt-2 space-y-1.5">
            {current.prepPlan.map((step, i) => (
              <li key={i} className="font-display text-foreground flex gap-3 text-[15px]">
                <span className="text-muted-foreground font-mono text-[13px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-display">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {interviewExperiences.length > 0 && (
        <section className="mt-8">
          <Separator className="mb-5" />
          <h2 className="font-display text-lg font-semibold tracking-tight">
            <MessagesSquare className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
            Interview experiences
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            First-hand accounts from people who interviewed here.
          </p>
          <LinkCards links={interviewExperiences} />
        </section>
      )}

      {importantLinks.length > 0 && (
        <section className="mt-8">
          <Separator className="mb-5" />
          <h2 className="font-display text-lg font-semibold tracking-tight">
            <BookOpen className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
            Worth reading
          </h2>
          <LinkCards links={importantLinks} />
        </section>
      )}

      {researchId && (
        <section className="mt-8">
          <Separator className="mb-5" />
          <h2 className="font-display text-lg font-semibold tracking-tight">
            <RefreshCw className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
            Keep on Generating
          </h2>
          <Card className="mt-4">
            <CardContent>
              <SectionLabel>
                <Search className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                Scout more rounds
              </SectionLabel>
              <p className="text-muted-foreground mt-1 text-xs">
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

              <div className="mt-4">
                <SectionLabel>
                  <Zap className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                  Effort
                </SectionLabel>
                <p className="text-muted-foreground mt-1 text-xs">
                  How hard to search these rounds. Also applies to the “More” buttons above.
                </p>
                <div className="mt-3">
                  <EffortPicker
                    value={effort}
                    onChange={setEffort}
                    credits={extendCredits}
                    disabled={busy !== null}
                  />
                </div>
              </div>

              {extendEstimate && extendCredits && (
                <div className="mt-4">
                  <EstimateInline
                    estimate={extendEstimate}
                    balance={balance}
                    ceiling={extendCredits[effort]}
                  />
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-muted-foreground truncate font-mono text-[11px]">
                  {busy === "__rounds__" ? (progress ?? "Starting…") : ""}
                </span>
                <Button
                  type="button"
                  disabled={extraRounds.length === 0 || busy !== null}
                  onClick={() => extend(extraRounds, "__rounds__")}>
                  {busy === "__rounds__" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  <span className="font-display">Scout these rounds →</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

/** The link list shared by "Interview experiences" and "Worth reading". */
function LinkCards({ links }: { links: ImportantLink[] }) {
  return (
    <ul className="mt-3 space-y-3">
      {links.map((link, i) => (
        <li key={i}>
          <Card>
            <CardContent>
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-baseline gap-2">
                  <LinkIcon className="text-tertiary h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-display text-foreground hover:text-tertiary text-[15px] leading-snug font-medium underline-offset-4 hover:underline">
                    {link.title}
                  </a>
                </span>
                <span className="text-tertiary bg-tertiary/10 shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px]">
                  {hostOf(link.url)}
                </span>
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
