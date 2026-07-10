"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import { Plus, RotateCcw, X } from "lucide-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { signInWithGoogle, useSession } from "@/lib/auth-client";
import { EFFORT_PRESETS, type Effort } from "@/lib/research/budget";
import type { PipelineProgressEvent, Report } from "@/lib/research/types";
import { zodFormResolver } from "@/lib/zod-form-resolver";

import { EffortPicker } from "@/features/research/effort-picker";
import {
  type ResearchFormValues,
  clearDraft,
  emptyFormValues,
  isDraftDirty,
  loadDraft,
  researchFormSchema,
  saveDraft,
} from "@/features/research/form-schema";
import { ReportView, SectionLabel } from "@/features/research/report-view";
import { RoundPicker, isCustomRound } from "@/features/research/round-picker";
import { explainError, streamSse } from "@/features/research/stream";

type Phase = "form" | "running" | "done" | "error";

interface ProgressLine extends PipelineProgressEvent {
  id: number;
}

export interface Me {
  signedIn: boolean;
  user: { name: string; email: string; image: string | null } | null;
  balance: number;
  maxRunCredits: number;
  minRunCredits: number;
  effortCredits?: Record<Effort, number>;
  extendCredits?: Record<Effort, number>;
}

const DRAFT_SAVE_DEBOUNCE_MS = 300;

export function ResearchExperience({
  onComplete,
  initialMe,
}: {
  onComplete?: (researchId: string) => void;
  /** Resolved on the server where we can, so the submit button never renders the wrong CTA. */
  initialMe?: Me;
} = {}) {
  const [phase, setPhase] = useState<Phase>("form");
  const [progress, setProgress] = useState<ProgressLine[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [researchId, setResearchId] = useState<string | null>(null);
  const [costUsd, setCostUsd] = useState<number | null>(null);
  const [creditsCharged, setCreditsCharged] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progressId = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<ResearchFormValues>({
    resolver: zodFormResolver(researchFormSchema),
    defaultValues: emptyFormValues,
    mode: "onBlur",
  });
  const { control, register, handleSubmit, watch, setValue, reset, formState } = form;
  const {
    fields: interviewerFields,
    append: appendInterviewer,
    remove: removeInterviewer,
  } = useFieldArray({ control, name: "interviewers" });

  const company = watch("company");
  const rounds = watch("rounds");
  const effort = watch("effort");
  const formValues = watch();

  // Load any saved draft only on the client, after hydration, so the server-rendered
  // markup (always the pristine defaults) matches what React expects to see first.
  useEffect(() => {
    const draft = loadDraft();
    if (draft) reset(draft);
  }, [reset]);

  // The landing page and /prepare render the same form under the same draft key, so
  // typing on one and navigating to the other resumes exactly where it left off.
  useEffect(() => {
    const subscription = watch((values) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveDraft(values as ResearchFormValues);
      }, DRAFT_SAVE_DEBOUNCE_MS);
    });
    return () => {
      subscription.unsubscribe();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [watch]);

  const { data: session, isPending: sessionPending } = useSession();
  const [me, setMe] = useState<Me | null>(initialMe ?? null);

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

  const maxRunCredits = me?.maxRunCredits ?? 130;
  /** Credit ceiling for the effort currently picked; the server is the source of truth. */
  const effortCeiling = me?.effortCredits?.[effort] ?? maxRunCredits;
  const minRunCredits = me?.minRunCredits ?? 50;
  const balance = me?.balance ?? 0;
  // The server already resolved this where it could; `useSession` only overrides
  // it once it has an answer, which is what lets a sign-out swap the button back.
  // Without this the button is absent until a `get-session` roundtrip lands.
  const signedIn = sessionPending ? Boolean(initialMe?.signedIn) : Boolean(session);
  const canAfford = balance >= minRunCredits;
  /** Until the balance lands, `balance` is 0 — which is not the same as "cannot afford". */
  const balanceKnown = me !== null;

  function toggleCategory(cat: string) {
    setValue("rounds", rounds.includes(cat) ? rounds.filter((c) => c !== cat) : [...rounds, cat], {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function addCustomRound(round: string) {
    if (!rounds.includes(round)) {
      setValue("rounds", [...rounds, round], { shouldDirty: true, shouldValidate: true });
    }
  }

  function removeCustomRound(round: string) {
    if (isCustomRound(round)) {
      setValue(
        "rounds",
        rounds.filter((c) => c !== round),
        { shouldDirty: true, shouldValidate: true }
      );
    }
  }

  function clearForm() {
    reset(emptyFormValues);
    clearDraft();
  }

  async function onSubmit(values: ResearchFormValues) {
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
          companyName: values.company.trim(),
          companyUrl: values.companyUrl.trim() || undefined,
          jobDescription: values.jobDescription.trim() || undefined,
          yearsExperience: values.yearsExperience.trim() || undefined,
          techStack: values.techStack.trim() || undefined,
          location: values.location.trim() || undefined,
          teamContext: values.teamContext.trim() || undefined,
          recruiterNotes: values.recruiterNotes.trim() || undefined,
          interviewers: values.interviewers
            .filter((i) => i.name.trim())
            .map((i) => ({ name: i.name.trim(), url: i.url.trim() || undefined })),
          interviewTypes: values.rounds,
          roleContext: values.role.trim() || undefined,
          effort: values.effort,
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
          clearDraft();
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

  function resetRun() {
    setPhase("form");
    setProgress([]);
    setReport(null);
    setResearchId(null);
    setError(null);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24">
      {phase === "form" && (
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <Card>
              <CardContent>
                <div className="flex items-center justify-between">
                  <SectionLabel>Target</SectionLabel>
                  {isDraftDirty(formValues) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearForm}
                      className="text-muted-foreground hover:text-foreground -mt-1 -mr-2">
                      <RotateCcw className="h-3.5 w-3.5" />
                      Clear form
                    </Button>
                  )}
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="company">
                          Company<span className="text-tertiary">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} id="company" placeholder="Stripe" autoFocus />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="companyUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="companyUrl">
                          Company URL <span className="opacity-60">· preferred</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} id="companyUrl" placeholder="https://stripe.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="role">
                          Role / level <span className="opacity-60">· optional</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} id="role" placeholder="Senior Backend Engineer" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="yearsExperience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="yearsExperience">
                          Years of Experience <span className="opacity-60">· optional</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} id="yearsExperience" placeholder="3-5" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="techStack"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="techStack">
                          Tech Stack <span className="opacity-60">· optional</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            id="techStack"
                            placeholder="React, Node.js, PostgreSQL"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="location">
                          Location <span className="opacity-60">· optional</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} id="location" placeholder="Bengaluru, India" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="teamContext"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="teamContext">
                          Team / org <span className="opacity-60">· optional</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} id="teamContext" placeholder="AWS EC2 · Ads Infra" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={control}
                  name="jobDescription"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel htmlFor="jobDescription">
                        Job Description <span className="opacity-60">· optional</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          id="jobDescription"
                          placeholder="Paste job posting or description"
                          rows={4}
                          className="placeholder:font-display max-h-40 resize-none overflow-y-auto"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="recruiterNotes"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel htmlFor="recruiterNotes">
                        Recruiter notes <span className="opacity-60">· optional</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          id="recruiterNotes"
                          placeholder="What the recruiter told you about the process, e.g. phone screen done, next is 2 coding rounds + system design"
                          rows={3}
                          className="placeholder:font-display resize-none"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="mt-4 space-y-2">
                  <Label className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                    Interviewers <span className="opacity-60">· optional</span>
                  </Label>

                  {interviewerFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Controller
                        control={control}
                        name={`interviewers.${index}.name`}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Name (used only as a public-search seed)"
                            className="flex-1"
                          />
                        )}
                      />
                      <Controller
                        control={control}
                        name={`interviewers.${index}.url`}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="LinkedIn or blog URL (optional)"
                            className="flex-1"
                          />
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeInterviewer(index)}
                        disabled={interviewerFields.length === 1}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {formState.errors.interviewers && (
                    <p className="text-destructive font-display text-xs">
                      One of the interviewer URLs doesn&rsquo;t look valid.
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendInterviewer({ name: "", url: "" })}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add interviewer
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <SectionLabel>Rounds to scout</SectionLabel>
                <p className="text-muted-foreground font-display mt-1 text-xs">
                  You can add more rounds later, from the finished report.
                </p>
                <div className="mt-4">
                  <RoundPicker
                    selected={rounds}
                    onToggle={toggleCategory}
                    onAddCustom={addCustomRound}
                    onRemoveCustom={removeCustomRound}
                  />
                </div>
                {formState.errors.rounds && (
                  <p className="text-destructive font-display mt-2 text-xs">
                    {formState.errors.rounds.message}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <SectionLabel>Effort</SectionLabel>
                <p className="text-muted-foreground font-display mt-1 text-xs">
                  How wide to search. Higher effort finds more questions and costs more credits.
                </p>
                <div className="mt-4">
                  <EffortPicker
                    value={effort}
                    onChange={(level) =>
                      setValue("effort", level, { shouldDirty: true, shouldValidate: true })
                    }
                    credits={me?.effortCredits}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between pt-2">
              <div className="max-w-xs space-y-1">
                <p className="text-muted-foreground font-display text-[11px] leading-relaxed">
                  Predictions are grounded in public evidence — not prophecy. Every question cites
                  its source.
                </p>
                {signedIn && balanceKnown && (
                  <p className="text-muted-foreground font-display text-[11px] leading-relaxed">
                    {EFFORT_PRESETS[effort].label} effort: capped at{" "}
                    <span className="text-tertiary">{Math.min(balance, effortCeiling)}</span>{" "}
                    credits. You are charged only what the run actually spends. Balance:{" "}
                    <span className="text-tertiary">{balance}</span>.
                  </p>
                )}
              </div>

              {!sessionPending && !signedIn && (
                <Button type="button" size="lg" onClick={() => signInWithGoogle()}>
                  Sign in to run →
                </Button>
              )}

              {/*
               * A balance we haven't read yet is not a balance of zero. Showing
               * "Buy credits" here and swapping it out a second later reads as a
               * paywall the user then has to un-see, so we hold the run button
               * disabled until we actually know.
               */}
              {signedIn && !balanceKnown && (
                <Button type="submit" size="lg" disabled>
                  Run reconnaissance →
                </Button>
              )}

              {signedIn && balanceKnown && !canAfford && (
                <Link href="/payments">
                  <Button type="button" size="lg">
                    Buy credits →
                  </Button>
                </Link>
              )}

              {signedIn && balanceKnown && canAfford && (
                <Button type="submit" size="lg" disabled={!company.trim() || rounds.length === 0}>
                  Run reconnaissance →
                </Button>
              )}
            </div>
          </form>
        </Form>
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
                <p className="text-foreground font-display mt-1 text-sm">{error}</p>
                <Button variant="outline" size="sm" onClick={resetRun} className="mt-3">
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
          company={formValues.company}
          onReset={resetRun}
          researchId={researchId ?? undefined}
          extendCredits={me?.extendCredits}
        />
      )}
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
              <span className="text-tertiary shrink-0 tracking-widest uppercase">{line.stage}</span>
              <span className="font-display">{line.message}</span>
            </li>
          ))}
          {lines.length === 0 && (
            <li className="text-muted-foreground font-display text-[13px]">Establishing feed…</li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
