"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import { Info, RefreshCw, Target, Trash2, X } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { signInWithGoogle, useSession } from "@/lib/auth-client";
import type { Effort } from "@/lib/research/budget";
import type { PipelineProgressEvent, Report } from "@/lib/research/types";
import { zodFormResolver } from "@/lib/zod-form-resolver";

import {
  type ResearchFormValues,
  clearDraft,
  emptyFormValues,
  loadDraft,
  researchFormSchema,
  saveDraft,
} from "@/features/research/form-schema";
import { ReportView } from "@/features/research/report-view";
import {
  EffortCard,
  EffortNote,
  RoundsCard,
  SectionsCard,
} from "@/features/research/research-form-cards";
import {
  ClearFormButton,
  LiveEstimate,
  RunButton,
} from "@/features/research/research-form-controls";
import { ResearchTerminal } from "@/features/research/research-terminal";
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
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const progressId = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<ResearchFormValues>({
    resolver: zodFormResolver(researchFormSchema),
    defaultValues: emptyFormValues,
    mode: "onBlur",
  });
  const { control, handleSubmit, watch, getValues, setValue, reset, formState } = form;
  const {
    fields: interviewerFields,
    append: appendInterviewer,
    remove: removeInterviewer,
  } = useFieldArray({ control, name: "interviewers" });

  // Deliberately no render-time `watch()` here. A bare `watch()` subscribes this
  // component to every field, so it re-rendered the whole form — four cards, both
  // pickers, every tooltip — on each keystroke anywhere in it. Each consumer now
  // subscribes to just the fields it displays, with `useWatch` in its own child
  // below, so a keystroke re-renders that child and nothing else. The estimate
  // still reprices on every keystroke; it just no longer drags the form with it.
  // (The callback form of `watch`, used for the draft save, never re-renders.)

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
        setLastSavedAt(Date.now());
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

  const minRunCredits = me?.minRunCredits ?? 50;
  const balance = me?.balance ?? 0;
  // The server already resolved this where it could; `useSession` only overrides
  // it once it has an answer, which is what lets a sign-out swap the button back.
  // Without this the button is absent until a `get-session` roundtrip lands.
  const signedIn = sessionPending ? Boolean(initialMe?.signedIn) : Boolean(session);
  const canAfford = balance >= minRunCredits;
  /** Until the balance lands, `balance` is 0 — which is not the same as "cannot afford". */
  const balanceKnown = me !== null;

  /** No ring without a balance to measure against — signed out, or still loading. */
  const ringBalance = signedIn && balanceKnown ? balance : undefined;

  function clearForm() {
    reset(emptyFormValues);
    clearDraft();
    setLastSavedAt(null);
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
          sections: values.sections,
        }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(explainError(res.status, body));
      }

      await streamSse(res.body, (msg) => {
        if (msg.kind === "progress") {
          // Bump the id outside the updater — React double-invokes updaters in
          // StrictMode, and an id that advances twice per line is a wasted key.
          const id = progressId.current++;
          setProgress((prev) => [...prev, { ...(msg as unknown as PipelineProgressEvent), id }]);
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
          {/* `relative` anchors the estimate rail, which hangs in the page margin
              rather than taking a column — that keeps the form itself lined up
              with the hero and the sections above and below it.

              The run is started by RunButton's confirmation dialog, never by the
              form itself, so an Enter keypress in a field must not slip past it. */}
          <form onSubmit={(e) => e.preventDefault()} className="relative mt-6">
            <div className="space-y-4">
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h2 className="text-tertiary font-display flex items-center text-lg font-medium capitalize">
                        <Target
                          className="mr-2 h-5 w-5 opacity-40 transition-all duration-200 hover:opacity-100 hover:drop-shadow-[0_0_8px_rgba(100,150,255,0.8)]"
                          aria-hidden="true"
                        />
                        Target
                      </h2>
                      {lastSavedAt && (
                        <span className="text-muted-foreground font-display animate-in fade-in slide-in-from-left-2 text-xs">
                          Progress saved
                        </span>
                      )}
                    </div>
                    <ClearFormButton control={control} onClear={clearForm} />
                  </div>
                  <p className="text-muted-foreground font-display mt-1 text-xs">
                    The company and role you are interviewing for, helps find relevant questions.
                  </p>
                  <div className="mt-4 grid gap-5 sm:grid-cols-2">
                    <FormField
                      control={control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="company" className="text-tertiary/60">
                            Company
                            <span className="text-tertiary/60">*</span>
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
                          <div className="flex items-center gap-1">
                            <FormLabel htmlFor="companyUrl" className="text-tertiary/60">
                              Company URL <span className="text-muted-foreground">· preferred</span>
                            </FormLabel>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Info className="text-muted-foreground h-2.5 w-2.5 cursor-help" />
                                  }
                                />
                                <TooltipContent>
                                  <span className="font-display">
                                    Helps find company-specific interview questions from public
                                    sources
                                  </span>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
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
                          <FormLabel htmlFor="role" className="text-tertiary/60">
                            Role / level <span className="text-muted-foreground">· optional</span>
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
                          <FormLabel htmlFor="yearsExperience" className="text-tertiary/60">
                            Years of Experience{" "}
                            <span className="text-muted-foreground">· optional</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} id="yearsExperience" placeholder="3-5" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="teamContext"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-1">
                            <FormLabel htmlFor="teamContext" className="text-tertiary/60">
                              Team / org <span className="text-muted-foreground">· optional</span>
                            </FormLabel>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Info className="text-muted-foreground h-2.5 w-2.5 cursor-help" />
                                  }
                                />
                                <TooltipContent>
                                  <span className="font-display">
                                    The team or organization you'd work on — helps find relevant
                                    system design questions
                                  </span>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <FormControl>
                            <Input {...field} id="teamContext" placeholder="R&D, Infra" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="location" className="text-tertiary/60">
                            Location <span className="text-muted-foreground">· optional</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} id="location" placeholder="Bengaluru, India" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="techStack"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <div className="flex items-center gap-1">
                            <FormLabel htmlFor="techStack" className="text-tertiary/60">
                              Tech Stack <span className="text-muted-foreground">· optional</span>
                            </FormLabel>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Info className="text-muted-foreground h-2.5 w-2.5 cursor-help" />
                                  }
                                />
                                <TooltipContent>
                                  <span className="font-display">
                                    Languages, frameworks, and tools the company uses — helps find
                                    relevant domain questions
                                  </span>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
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
                      name="jobDescription"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <div className="flex items-center gap-1">
                            <FormLabel htmlFor="jobDescription" className="text-tertiary/60">
                              Job Description{" "}
                              <span className="text-muted-foreground">· optional</span>
                            </FormLabel>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Info className="text-muted-foreground h-2.5 w-2.5 cursor-help" />
                                  }
                                />
                                <TooltipContent>
                                  <span className="font-display">
                                    Paste the job posting to get questions tailored to the specific
                                    role
                                  </span>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
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
                        <FormItem className="col-span-2">
                          <div className="flex items-center gap-1">
                            <FormLabel htmlFor="recruiterNotes" className="text-tertiary/60">
                              Recruiter notes{" "}
                              <span className="text-muted-foreground">· optional</span>
                            </FormLabel>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Info className="text-muted-foreground h-2.5 w-2.5 cursor-help" />
                                  }
                                />
                                <TooltipContent>
                                  <span className="font-display">
                                    What did the recruiter tell you about the process? Which rounds
                                    to expect?
                                  </span>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <FormControl>
                            <Textarea
                              {...field}
                              id="recruiterNotes"
                              placeholder="What the recruiter told you about the process, e.g. phone screen done, next is 2 coding rounds + system design"
                              rows={3}
                              className="placeholder:font-display max-h-40 resize-none overflow-y-auto"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="col-span-2 space-y-2">
                      <div className="flex items-center gap-1">
                        <Label className="text-tertiary/60 font-mono text-[10px] tracking-[0.16em] uppercase">
                          Interviewers <span className="text-muted-foreground">· optional</span>
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Info className="text-muted-foreground h-2.5 w-2.5 cursor-help" />
                              }
                            />
                            <TooltipContent>
                              <span className="font-display">
                                Names help personalize questions. URLs are used only as
                                public-search seeds and are never stored.
                              </span>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

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
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeInterviewer(index)}
                                    disabled={interviewerFields.length === 1}
                                    className="cursor-pointer text-red-400 hover:text-red-500"
                                  />
                                }>
                                <Trash2 className="h-4 w-4" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <span className="font-display">Remove interviewer</span>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      ))}
                      {formState.errors.interviewers && (
                        <p className="text-destructive font-display text-xs">
                          One of the interviewer URLs doesn&rsquo;t look valid.
                        </p>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => appendInterviewer({ name: "", url: "" })}
                              />
                            }>
                            Add interviewer
                          </TooltipTrigger>
                          <TooltipContent>
                            <span className="font-display">
                              Add another interviewer to personalize your report
                            </span>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <SectionsCard control={control} setValue={setValue} />

              <RoundsCard
                control={control}
                setValue={setValue}
                error={formState.errors.rounds?.message}
              />

              <EffortCard control={control} setValue={setValue} credits={me?.effortCredits} />

              <div className="flex items-center justify-between pt-2">
                <div className="max-w-xs space-y-1">
                  {/* <p className="text-muted-foreground font-display text-sm font-medium leading-relaxed">
                    Searches are grounded in public evidence, not prophecy. Every question cites
                    its source.
                  </p> */}
                  {signedIn && balanceKnown && (
                    <EffortNote control={control} balance={balance} me={me} />
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
                  <Button type="button" size="lg" variant="tertiary" disabled>
                    Run reconnaissance{" "}
                    <RefreshCw className="ml-1 inline size-4" aria-hidden="true" />
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
                  <RunButton control={control} me={me} onConfirm={handleSubmit(onSubmit)} />
                )}
              </div>
            </div>

            <LiveEstimate control={control} balance={ringBalance} me={me} />
          </form>
        </Form>
      )}

      {(phase === "running" || phase === "error") && (
        <div className="mt-6 space-y-4">
          <ResearchTerminal
            lines={progress}
            company={getValues("company")}
            failed={phase === "error"}
          />
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

      {/* The form is unmounted here and nothing is editing it, so a one-shot read
          beats a subscription. */}
      {phase === "done" && report && (
        <ReportView
          report={report}
          costUsd={costUsd}
          creditsCharged={creditsCharged}
          company={getValues("company")}
          onReset={resetRun}
          researchId={researchId ?? undefined}
          extendCredits={me?.extendCredits}
          balance={ringBalance}
          roleContext={getValues("role").trim() || undefined}
        />
      )}
    </div>
  );
}
