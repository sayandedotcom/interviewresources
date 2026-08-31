"use client";

import { useState } from "react";

import Link from "next/link";

import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { jobApplicationSchema } from "@/lib/careers/application";
import { cn } from "@/lib/utils";

interface ApplicationFormProps {
  roleSlug: string;
  roleTitle: string;
}

type FieldErrors = Partial<Record<"name" | "email" | "message" | "consent" | "form", string>>;

/** One label + control + error, so the three fields cannot drift apart. */
function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="font-display">
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-destructive font-display text-xs">
          {error}
        </p>
      ) : hint ? (
        <p className="text-muted-foreground font-display text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

export function ApplicationForm({ roleSlug, roleTitle }: ApplicationFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSending) return;

    // Validated with the same schema the route uses, so the browser and the
    // server can never disagree about what a valid application looks like.
    const parsed = jobApplicationSchema.safeParse({ roleSlug, name, email, message, consent });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "form") as keyof FieldErrors;
        next[field] ??= issue.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setIsSending(true);
    try {
      const res = await fetch("/api/careers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        fieldErrors?: FieldErrors;
      };

      if (!res.ok) {
        setErrors({ ...body.fieldErrors, form: body.error ?? "Something went wrong." });
        return;
      }
      setIsSent(true);
    } catch {
      setErrors({ form: "We could not reach the server. Please try again." });
    } finally {
      setIsSending(false);
    }
  }

  if (isSent) {
    return (
      <div
        role="status"
        className="border-primary/30 bg-primary/5 rounded-xl border p-8 text-center">
        <CheckCircle2 className="text-primary mx-auto h-8 w-8" aria-hidden />
        <h3 className="font-display mt-4 text-xl font-semibold tracking-tight">
          Applied. Your application is sent.
        </h3>
        <p className="font-display text-muted-foreground mx-auto mt-3 max-w-md text-sm leading-relaxed">
          Thanks for applying to {roleTitle}. We read every application ourselves and we will get
          back to you until then, use our application and tell us what you would change about it.
          That is the most useful thing you can put in front of us.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" render={<Link href="/" />}>
            Try the product
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/careers" />}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            All open roles
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      <Field id="name" label="Your name" error={errors.name}>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
          className="h-10"
        />
      </Field>

      <Field id="email" label="Email" error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          className="h-10"
        />
      </Field>

      <Field
        id="message"
        label="Message to the recruiter"
        hint="No cover letter template, please. Tell us what you have built and why this role."
        error={errors.message}>
        <Textarea
          id="message"
          name="message"
          rows={8}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "message-error" : undefined}
          className="min-h-40"
        />
      </Field>

      <div className="grid gap-2">
        <label
          htmlFor="consent"
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
            errors.consent ? "border-destructive" : "hover:border-ring/50"
          )}>
          <input
            id="consent"
            name="consent"
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? "consent-error" : undefined}
            className="accent-primary mt-0.5 h-4 w-4 shrink-0 cursor-pointer"
          />
          <span className="font-display text-sm leading-relaxed">
            I give permission for <strong className="font-semibold">Interview Resources</strong> to
            store the details above and contact me about this application.
          </span>
        </label>
        {errors.consent ? (
          <p id="consent-error" className="text-destructive font-display text-xs">
            {errors.consent}
          </p>
        ) : null}
      </div>

      {errors.form ? (
        <p role="alert" className="text-destructive font-display text-sm">
          {errors.form}
        </p>
      ) : null}

      <div>
        <Button type="submit" size="lg" disabled={isSending} className="w-full sm:w-auto">
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Sending
            </>
          ) : (
            "Submit application"
          )}
        </Button>
      </div>
    </form>
  );
}
