"use client";

import { useState } from "react";

import { Download, Loader2, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { CONFIDENCE_META, categoryCode, categoryLabel } from "@/lib/research/display";
import { INTERVIEW_CATEGORIES, type InterviewCategory, type Report } from "@/lib/research/types";

import { RoundPicker } from "@/features/research/round-picker";
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
  canExport,
  company,
  onReset,
  researchId,
}: {
  report: Report;
  costUsd: number | null;
  creditsCharged: number | null;
  canExport: boolean;
  company: string;
  onReset?: () => void;
  /** Enables the extend controls. Absent for a report not yet persisted. */
  researchId?: string;
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

  async function extend(interviewTypes: string[], token: string) {
    if (!researchId || busy) return;
    setBusy(token);
    setProgress(null);
    setExtendError(null);

    try {
      const res = await fetch(`/api/research/${researchId}/extend`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ interviewTypes }),
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

  // Predefined categories in taxonomy order, then custom rounds as first seen. The model
  // can also return a round the user never asked for (surfaced by loop-format discovery).
  const present = current.questions.map((q) => q.category);
  const order = [
    ...INTERVIEW_CATEGORIES.filter((cat) => present.includes(cat)),
    ...present.filter(
      (cat, i) =>
        !INTERVIEW_CATEGORIES.includes(cat as InterviewCategory) && present.indexOf(cat) === i
    ),
  ];
  const grouped = order.map((cat) => ({
    cat,
    questions: current.questions.filter((q) => q.category === cat),
  }));

  // Reports generated before importantLinks existed are stored without the field.
  const importantLinks = current.importantLinks ?? [];

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between pb-3">
        <SectionLabel>Scouting report</SectionLabel>
        <div className="flex items-center gap-4">
          {creditsCharged != null && (
            <span
              className="font-display text-muted-foreground font-mono text-[11px]"
              title={costUsd != null ? `Metered cost $${costUsd.toFixed(4)}` : undefined}>
              {creditsCharged} credits
            </span>
          )}
          {canExport && (
            <Button variant="outline" size="sm" onClick={() => downloadReport(current, company)}>
              <Download className="mr-1 h-4 w-4" />
              <span className="font-display">Export</span>
            </Button>
          )}
          {onReset && (
            <Button variant="outline" size="sm" onClick={onReset}>
              <span className="font-display">New report</span>
            </Button>
          )}
        </div>
      </div>
      <Separator />

      <section className="mt-5">
        <h2 className="font-display text-lg font-semibold tracking-tight">The company</h2>
        <p className="font-display text-foreground mt-1.5 text-[15px] leading-relaxed">
          {current.companySnapshot}
        </p>
        {/* Reports generated before companyExplainer existed are stored without it. */}
        {current.companyExplainer && (
          <div className="bg-tertiary/10 border-tertiary/40 mt-3 rounded-md border-l-2 px-4 py-3">
            <SectionLabel>In plain terms</SectionLabel>
            <p className="font-display text-foreground mt-1.5 text-[15px] leading-relaxed">
              {current.companyExplainer}
            </p>
          </div>
        )}
      </section>

      {current.likelyLoopStructure && (
        <section className="mt-6">
          <SectionLabel>The loop</SectionLabel>
          <p className="font-display border-primary text-foreground mt-2 border-l-2 pl-3 text-[15px] leading-relaxed">
            {current.likelyLoopStructure}
          </p>
        </section>
      )}

      {current.interviewerSummary && (
        <Card className="mt-6">
          <CardContent>
            <SectionLabel>The interviewer</SectionLabel>
            <p className="font-display text-foreground mt-1.5 text-[15px] leading-relaxed">
              {current.interviewerSummary}
            </p>
          </CardContent>
        </Card>
      )}

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold tracking-tight">Predicted questions</h2>
        <div className="mt-3 space-y-6">
          {grouped.map(({ cat, questions }) => (
            <div key={cat}>
              <div className="flex items-baseline gap-2">
                <span className="text-tertiary font-mono text-[10px] font-semibold tracking-widest">
                  {categoryCode(cat)}
                </span>
                <h3 className="font-display text-sm font-semibold tracking-wide uppercase">
                  {categoryLabel(cat)}
                </h3>
                {researchId && (
                  <div className="ml-auto flex items-center gap-2">
                    {busy === cat && progress && (
                      <span className="text-muted-foreground hidden max-w-[16rem] truncate font-mono text-[11px] sm:inline">
                        {progress}
                      </span>
                    )}
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Add more ${categoryLabel(cat)} questions`}
                            className="text-tertiary hover:bg-tertiary/10 hover:text-tertiary h-7 shrink-0 px-2"
                            disabled={busy !== null}
                            onClick={() => extend([cat], cat)}
                          />
                        }>
                        {busy === cat ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        <span className="font-display ml-1 text-xs">More</span>
                      </TooltipTrigger>
                      <TooltipContent>Add more questions</TooltipContent>
                    </Tooltip>
                  </div>
                )}
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
                          <span
                            className={`shrink-0 font-mono text-[13px] leading-none ${
                              q.confidence === "low" ? "text-muted-foreground" : "text-primary"
                            }`}
                            title={`Confidence: ${CONFIDENCE_META[q.confidence].label}`}>
                            {CONFIDENCE_META[q.confidence].signal}
                          </span>
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
                                render={<a href={url} target="_blank" rel="noopener noreferrer" />}>
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
          ))}
        </div>
        {extendError && (
          <p className="text-destructive mt-3 font-mono text-[11px]">{extendError}</p>
        )}
      </section>

      {current.prepPlan.length > 0 && (
        <section className="mt-8">
          <Separator className="mb-5" />
          <h2 className="font-display text-lg font-semibold tracking-tight">Prep plan</h2>
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

      {importantLinks.length > 0 && (
        <section className="mt-8">
          <Separator className="mb-5" />
          <h2 className="font-display text-lg font-semibold tracking-tight">Worth reading</h2>
          <ul className="mt-3 space-y-3">
            {importantLinks.map((link, i) => (
              <li key={i}>
                <Card>
                  <CardContent>
                    <div className="flex items-baseline justify-between gap-3">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-display text-foreground hover:text-tertiary flex items-baseline gap-2 text-[15px] leading-snug font-medium underline-offset-4 hover:underline">
                        <span className="bg-tertiary inline-block h-1.5 w-1.5 shrink-0 translate-y-[-2px] rounded-full" />
                        {link.title}
                      </a>
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
        </section>
      )}

      {researchId && (
        <section className="mt-8">
          <Separator className="mb-5" />
          <Card>
            <CardContent>
              <SectionLabel>Scout more rounds</SectionLabel>
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

/** Pro-only export. Client-side download, no round trip. */
function downloadReport(report: Report, company: string) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const slug =
    company
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      // Strip the edge hyphens punctuation leaves behind, or "Acme Corp!" would
      // download as `scouting-report-acme-corp-.json` and "!!!" as `--.json`.
      .replace(/^-+|-+$/g, "") || "report";

  const a = document.createElement("a");
  a.href = url;
  a.download = `scouting-report-${slug}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}
