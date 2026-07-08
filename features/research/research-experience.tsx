"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CATEGORY_META, CONFIDENCE_META } from "@/lib/research/display";
import {
  INTERVIEW_CATEGORIES,
  type InterviewCategory,
  type PipelineProgressEvent,
  type Report,
} from "@/lib/research/types";

type Phase = "form" | "running" | "done" | "error";

interface ProgressLine extends PipelineProgressEvent {
  id: number;
}

export function ResearchExperience() {
  const [phase, setPhase] = useState<Phase>("form");
  const [company, setCompany] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [interviewer, setInterviewer] = useState("");
  const [role, setRole] = useState("");
  const [selected, setSelected] = useState<InterviewCategory[]>(["dsa", "system_design"]);
  const [progress, setProgress] = useState<ProgressLine[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [costUsd, setCostUsd] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progressId = useRef(0);

  function toggleCategory(cat: InterviewCategory) {
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || selected.length === 0) return;

    setPhase("running");
    setProgress([]);
    setReport(null);
    setError(null);
    setCostUsd(null);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyName: company.trim(),
          companyUrl: companyUrl.trim() || undefined,
          interviewerName: interviewer.trim() || undefined,
          interviewTypes: selected,
          roleContext: role.trim() || undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status}).`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const line = chunk.replace(/^data: /, "").trim();
          if (!line) continue;
          const msg = JSON.parse(line);

          if (msg.kind === "progress") {
            setProgress((prev) => [...prev, { ...msg, id: progressId.current++ }]);
          } else if (msg.kind === "report") {
            setReport(msg.report);
            setCostUsd(msg.costUsd);
            setPhase("done");
          } else if (msg.kind === "error") {
            setError(msg.message);
            setPhase("error");
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  function reset() {
    setPhase("form");
    setProgress([]);
    setReport(null);
    setError(null);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24">
      {phase === "form" && (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Card>
            <CardContent>
              <SectionLabel>Target</SectionLabel>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Company" htmlFor="company" required>
                  <Input
                    id="company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Stripe"
                    autoFocus
                  />
                </Field>
                <Field label="Company URL" htmlFor="companyUrl" hint="preferred">
                  <Input
                    id="companyUrl"
                    value={companyUrl}
                    onChange={(e) => setCompanyUrl(e.target.value)}
                    placeholder="https://stripe.com"
                  />
                </Field>
                <Field label="Interviewer" htmlFor="interviewer" hint="optional">
                  <Input
                    id="interviewer"
                    value={interviewer}
                    onChange={(e) => setInterviewer(e.target.value)}
                    placeholder="Name (used only as a public-search seed)"
                  />
                </Field>
                <Field label="Role / level" htmlFor="role" hint="optional">
                  <Input
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Senior Backend Engineer"
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <SectionLabel>Rounds to scout</SectionLabel>
              <div className="mt-4 flex flex-wrap gap-2">
                {INTERVIEW_CATEGORIES.map((cat) => {
                  const on = selected.includes(cat);
                  return (
                    <Button
                      type="button"
                      key={cat}
                      size="lg"
                      variant={on ? "default" : "outline"}
                      onClick={() => toggleCategory(cat)}
                      aria-pressed={on}
                    >
                      <span className="font-mono text-[10px] tracking-widest opacity-70">
                        {CATEGORY_META[cat].code}
                      </span>
                      <span className="font-display">{CATEGORY_META[cat].label}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-2">
            <p className="max-w-xs font-mono text-[11px] leading-relaxed text-muted-foreground">
              Predictions are grounded in public evidence — not prophecy. Every
              question cites its source.
            </p>
            <Button
              type="submit"
              size="lg"
              disabled={!company.trim() || selected.length === 0}
            >
              Run reconnaissance →
            </Button>
          </div>
        </form>
      )}

      {(phase === "running" || phase === "error") && (
        <div className="mt-6 space-y-4">
          <ProgressLog lines={progress} />
          {phase === "error" && error && (
            <Card>
              <CardContent>
                <p className="font-mono text-[11px] uppercase tracking-widest text-destructive">
                  Reconnaissance failed
                </p>
                <p className="mt-1 text-sm text-foreground">{error}</p>
                <Button variant="outline" size="sm" onClick={reset} className="mt-3">
                  Start over
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {phase === "done" && report && (
        <ReportView report={report} costUsd={costUsd} onReset={reset} />
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </span>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor} className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
        {required && <span className="text-foreground">*</span>}
        {hint && <span className="opacity-60">· {hint}</span>}
      </Label>
      {children}
    </div>
  );
}

function ProgressLog({ lines }: { lines: ProgressLine[] }) {
  return (
    <Card className="bg-muted">
      <CardContent>
        <SectionLabel>Live feed</SectionLabel>
        <ul className="mt-3 space-y-1.5">
          {lines.map((line) => (
            <li key={line.id} className="flex gap-3 font-mono text-[13px] text-foreground">
              <span className="shrink-0 uppercase tracking-widest text-muted-foreground">
                {line.stage}
              </span>
              <span>{line.message}</span>
            </li>
          ))}
          {lines.length === 0 && (
            <li className="font-mono text-[13px] text-muted-foreground">Establishing feed…</li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

function ReportView({
  report,
  costUsd,
  onReset,
}: {
  report: Report;
  costUsd: number | null;
  onReset: () => void;
}) {
  const grouped = INTERVIEW_CATEGORIES.map((cat) => ({
    cat,
    questions: report.questions.filter((q) => q.category === cat),
  })).filter((g) => g.questions.length > 0);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between pb-3">
        <SectionLabel>Scouting report</SectionLabel>
        <div className="flex items-center gap-4">
          {costUsd != null && (
            <span className="font-mono text-[11px] text-muted-foreground">
              cost ${costUsd.toFixed(2)}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={onReset}>
            New report
          </Button>
        </div>
      </div>
      <Separator />

      <section className="mt-5">
        <h2 className="font-display text-lg font-semibold tracking-tight">The company</h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-foreground">
          {report.companySnapshot}
        </p>
      </section>

      {report.likelyLoopStructure && (
        <section className="mt-6">
          <SectionLabel>The loop</SectionLabel>
          <p className="mt-2 border-l-2 border-primary pl-3 text-[15px] leading-relaxed text-foreground">
            {report.likelyLoopStructure}
          </p>
        </section>
      )}

      {report.interviewerSummary && (
        <Card className="mt-6">
          <CardContent>
            <SectionLabel>The interviewer</SectionLabel>
            <p className="mt-1.5 text-[15px] leading-relaxed text-foreground">
              {report.interviewerSummary}
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
                <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
                  {CATEGORY_META[cat].code}
                </span>
                <h3 className="font-display text-sm font-semibold uppercase tracking-wide">
                  {CATEGORY_META[cat].label}
                </h3>
              </div>
              <ul className="mt-2 space-y-3">
                {questions.map((q, i) => (
                  <li key={i}>
                    <Card>
                    <CardContent>
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-display text-[15px] font-medium leading-snug text-foreground">
                          {q.question}
                        </p>
                        <span
                          className={`shrink-0 font-mono text-[13px] leading-none ${
                            q.confidence === "low" ? "text-muted-foreground" : "text-primary"
                          }`}
                          title={`Confidence: ${CONFIDENCE_META[q.confidence].label}`}
                        >
                          {CONFIDENCE_META[q.confidence].signal}
                        </span>
                      </div>
                      <p className="font-display mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                        {q.rationale}
                      </p>
                      <details className="mt-2">
                        <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
                          Prep note
                        </summary>
                        <p className="font-display mt-1.5 text-[13.5px] leading-relaxed text-foreground">
                          {q.prepNote}
                        </p>
                      </details>
                      {q.evidenceUrls.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {q.evidenceUrls.map((url, j) => (
                            <Badge key={j} variant="outline" render={<a href={url} target="_blank" rel="noopener noreferrer" />}>
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
      </section>

      {report.prepPlan.length > 0 && (
        <section className="mt-8">
          <Separator className="mb-5" />
          <h2 className="font-display text-lg font-semibold tracking-tight">Prep plan</h2>
          <ol className="mt-2 space-y-1.5">
            {report.prepPlan.map((step, i) => (
              <li key={i} className="flex gap-3 text-[15px] text-foreground">
                <span className="font-mono text-[13px] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-display">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}
