"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ReportView, SectionLabel } from "@/features/research/report-view";
import { CATEGORY_META, categoryLabel } from "@/lib/research/display";
import { signInWithGoogle, useSession } from "@/lib/auth-client";
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

interface Me {
  signedIn: boolean;
  user: { name: string; email: string; image: string | null; tier: "free" | "pro" } | null;
  balance: number;
  maxRunCredits: number;
  minRunCredits: number;
}

export function ResearchExperience({
  onComplete,
}: {
  onComplete?: (researchId: string) => void;
} = {}) {
  const [phase, setPhase] = useState<Phase>("form");
  const [company, setCompany] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [techStack, setTechStack] = useState("");
  const [interviewers, setInterviewers] = useState([{ name: "", url: "" }]);
  const [role, setRole] = useState("");
  const [selected, setSelected] = useState<string[]>(["dsa", "system_design"]);
  const [customRound, setCustomRound] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [progress, setProgress] = useState<ProgressLine[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [costUsd, setCostUsd] = useState<number | null>(null);
  const [creditsCharged, setCreditsCharged] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progressId = useRef(0);

  const { data: session, isPending: sessionPending } = useSession();
  const [me, setMe] = useState<Me | null>(null);

  // Advisory only — every gate below is also enforced server-side.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session]);

  const isPro = me?.user?.tier === "pro";
  const maxRunCredits = me?.maxRunCredits ?? 130;
  const minRunCredits = me?.minRunCredits ?? 50;
  const balance = me?.balance ?? 0;
  const signedIn = Boolean(session);
  const canAfford = balance >= minRunCredits;

  function toggleCategory(cat: string) {
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  function addCustomRound() {
    const trimmed = customRound.trim().toLowerCase().replace(/\s+/g, "_");
    if (trimmed && !selected.includes(trimmed)) {
      setSelected((prev) => [...prev, trimmed]);
    }
    setCustomRound("");
  }

  function removeCustomRound(round: string) {
    if (!INTERVIEW_CATEGORIES.includes(round as InterviewCategory)) {
      setSelected((prev) => prev.filter((c) => c !== round));
    }
  }

  function addInterviewer() {
    setInterviewers((prev) => [...prev, { name: "", url: "" }]);
  }

  function removeInterviewer(index: number) {
    setInterviewers((prev) => prev.filter((_, i) => i !== index));
  }

  function updateInterviewer(index: number, field: "name" | "url", value: string) {
    setInterviewers((prev) =>
      prev.map((int, i) => (i === index ? { ...int, [field]: value } : int)),
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
    setCreditsCharged(null);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyName: company.trim(),
          companyUrl: companyUrl.trim() || undefined,
          jobDescription: jobDescription.trim() || undefined,
          yearsExperience: yearsExperience.trim() || undefined,
          techStack: techStack.trim() || undefined,
          // Interviewer research is Pro-only; the server rejects it otherwise.
          interviewers: isPro
            ? interviewers
                .filter((i) => i.name.trim())
                .map((i) => ({ name: i.name.trim(), url: i.url.trim() || undefined }))
            : [],
          interviewTypes: selected,
          roleContext: role.trim() || undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(explainError(res.status, body));
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
            setCreditsCharged(msg.creditsCharged ?? null);
            if (typeof msg.balanceAfter === "number") {
              setMe((prev) => (prev ? { ...prev, balance: msg.balanceAfter } : prev));
            }
            setPhase("done");
            if (msg.researchId) onComplete?.(msg.researchId);
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
    setShowCustomInput(false);
    setCustomRound("");
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
                <Field label="Role / level" htmlFor="role" hint="optional">
                  <Input
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Senior Backend Engineer"
                  />
                </Field>
                <Field label="Years of Experience" htmlFor="yearsExperience" hint="optional">
                  <Input
                    id="yearsExperience"
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(e.target.value)}
                    placeholder="5"
                  />
                </Field>
                <Field label="Tech Stack" htmlFor="techStack" hint="optional">
                  <Input
                    id="techStack"
                    value={techStack}
                    onChange={(e) => setTechStack(e.target.value)}
                    placeholder="React, Node.js, PostgreSQL"
                  />
                </Field>
              </div>

              <div className="mt-4 space-y-1.5">
                <Label htmlFor="jobDescription" className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Job Description <span className="opacity-60">· optional</span>
                </Label>
                <Textarea
                  id="jobDescription"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste job posting or description"
                  rows={4}
                  className="placeholder:font-display"
                />
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Interviewers
                  </Label>
                  {!isPro && (
                    <Badge variant="outline" className="font-mono text-[10px] tracking-widest">
                      Pro
                    </Badge>
                  )}
                </div>

                {!isPro && (
                  <p className="text-xs text-muted-foreground">
                    Interviewer research is a Pro feature.{" "}
                    <Link href="/pricing" className="text-tertiary hover:underline">
                      Upgrade to unlock
                    </Link>
                    .
                  </p>
                )}

                {interviewers.map((int, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={int.name}
                      onChange={(e) => updateInterviewer(index, "name", e.target.value)}
                      placeholder="Name (used only as a public-search seed)"
                      className="flex-1"
                      disabled={!isPro}
                    />
                    <Input
                      value={int.url}
                      onChange={(e) => updateInterviewer(index, "url", e.target.value)}
                      placeholder="LinkedIn or blog URL (optional)"
                      className="flex-1"
                      disabled={!isPro}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeInterviewer(index)}
                      disabled={!isPro || interviewers.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addInterviewer}
                  disabled={!isPro}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add interviewer
                </Button>
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
                {selected
                  .filter((s) => !INTERVIEW_CATEGORIES.includes(s as InterviewCategory))
                  .map((custom) => (
                    <Button
                      type="button"
                      key={custom}
                      size="lg"
                      variant="default"
                      onClick={() => removeCustomRound(custom)}
                      title="Click to remove"
                    >
                      <span className="font-display">{categoryLabel(custom)}</span>
                      <X className="ml-1 h-4 w-4" />
                    </Button>
                  ))}
                {showCustomInput ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={customRound}
                      onChange={(e) => setCustomRound(e.target.value)}
                      placeholder="Custom round name"
                      className="h-9 w-40"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomRound();
                        }
                      }}
                    />
                    <Button type="button" size="sm" onClick={addCustomRound}>
                      Add
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowCustomInput(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="lg" onClick={() => setShowCustomInput(true)}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add round
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-2">
            <div className="max-w-xs space-y-1">
              <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                Predictions are grounded in public evidence — not prophecy. Every
                question cites its source.
              </p>
              {signedIn && (
                <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                  Typically ~46 credits. This run is capped at{" "}
                  {Math.min(balance, maxRunCredits)}. Balance: {balance}.
                </p>
              )}
            </div>

            {!sessionPending && !signedIn && (
              <Button type="button" size="lg" onClick={() => signInWithGoogle()}>
                Sign in to run →
              </Button>
            )}

            {signedIn && !canAfford && (
              <Link href="/payments">
                <Button type="button" size="lg">
                  Buy credits →
                </Button>
              </Link>
            )}

            {signedIn && canAfford && (
              <Button
                type="submit"
                size="lg"
                disabled={!company.trim() || selected.length === 0}
              >
                Run reconnaissance →
              </Button>
            )}
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
        <ReportView
          report={report}
          costUsd={costUsd}
          creditsCharged={creditsCharged}
          canExport={isPro}
          company={company}
          onReset={reset}
        />
      )}
    </div>
  );
}

/** Turns the route's error codes into something a person can act on. */
function explainError(status: number, body: { error?: string; detail?: string; balance?: number; required?: number }): string {
  switch (body.error) {
    case "unauthenticated":
      return "Please sign in before running a report.";
    case "insufficient_credits":
      return `Not enough credits: a report needs up to ${body.required}, and you have ${body.balance}. Buy more credits to continue.`;
    case "pro_required":
      return body.detail ?? "That feature requires Pro.";
    default:
      return body.detail ?? body.error ?? `Request failed (${status}).`;
  }
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

