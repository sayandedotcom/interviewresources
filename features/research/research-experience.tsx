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

import { signInWithGoogle, useSession } from "@/lib/auth-client";
import type { PipelineProgressEvent, Report } from "@/lib/research/types";

import { ReportView, SectionLabel } from "@/features/research/report-view";
import { RoundPicker, isCustomRound } from "@/features/research/round-picker";
import { explainError, streamSse } from "@/features/research/stream";

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
  const [progress, setProgress] = useState<ProgressLine[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [researchId, setResearchId] = useState<string | null>(null);
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
    setSelected((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  function addCustomRound(round: string) {
    setSelected((prev) => (prev.includes(round) ? prev : [...prev, round]));
  }

  function removeCustomRound(round: string) {
    if (isCustomRound(round)) {
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
      prev.map((int, i) => (i === index ? { ...int, [field]: value } : int))
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || selected.length === 0) return;

    setPhase("running");
    setProgress([]);
    setReport(null);
    setResearchId(null);
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

      await streamSse(res.body, (msg) => {
        if (msg.kind === "progress") {
          setProgress((prev) => [
            ...prev,
            { ...(msg as unknown as PipelineProgressEvent), id: progressId.current++ },
          ]);
        } else if (msg.kind === "report") {
          setReport(msg.report as Report);
          setCostUsd(msg.costUsd as number);
          setCreditsCharged((msg.creditsCharged as number) ?? null);
          if (typeof msg.balanceAfter === "number") {
            const balanceAfter = msg.balanceAfter;
            setMe((prev) => (prev ? { ...prev, balance: balanceAfter } : prev));
          }
          setPhase("done");
          if (msg.researchId) {
            setResearchId(String(msg.researchId));
            onComplete?.(String(msg.researchId));
          }
        } else if (msg.kind === "error") {
          setError(String(msg.message));
          setPhase("error");
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  function reset() {
    setPhase("form");
    setProgress([]);
    setReport(null);
    setResearchId(null);
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
                <Label
                  htmlFor="jobDescription"
                  className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
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
                  <Label className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                    Interviewers
                  </Label>
                  {!isPro && (
                    <Badge variant="outline" className="font-mono text-[10px] tracking-widest">
                      Pro
                    </Badge>
                  )}
                </div>

                {!isPro && (
                  <p className="text-muted-foreground text-xs">
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
                      disabled={!isPro || interviewers.length === 1}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addInterviewer}
                  disabled={!isPro}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add interviewer
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <SectionLabel>Rounds to scout</SectionLabel>
              <p className="text-muted-foreground mt-1 text-xs">
                You can add more rounds later, from the finished report.
              </p>
              <div className="mt-4">
                <RoundPicker
                  selected={selected}
                  onToggle={toggleCategory}
                  onAddCustom={addCustomRound}
                  onRemoveCustom={removeCustomRound}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-2">
            <div className="max-w-xs space-y-1">
              <p className="text-muted-foreground font-mono text-[11px] leading-relaxed">
                Predictions are grounded in public evidence — not prophecy. Every question cites its
                source.
              </p>
              {signedIn && (
                <p className="text-muted-foreground font-mono text-[11px] leading-relaxed">
                  Typically ~46 credits. This run is capped at {Math.min(balance, maxRunCredits)}.
                  Balance: {balance}.
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
              <Button type="submit" size="lg" disabled={!company.trim() || selected.length === 0}>
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
                <p className="text-destructive font-mono text-[11px] tracking-widest uppercase">
                  Reconnaissance failed
                </p>
                <p className="text-foreground mt-1 text-sm">{error}</p>
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
          researchId={researchId ?? undefined}
        />
      )}
    </div>
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
      <Label
        htmlFor={htmlFor}
        className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
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
            <li key={line.id} className="text-foreground flex gap-3 font-mono text-[13px]">
              <span className="text-muted-foreground shrink-0 tracking-widest uppercase">
                {line.stage}
              </span>
              <span>{line.message}</span>
            </li>
          ))}
          {lines.length === 0 && (
            <li className="text-muted-foreground font-mono text-[13px]">Establishing feed…</li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
