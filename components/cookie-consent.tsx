"use client";

import * as React from "react";

import Link from "next/link";

import { X } from "lucide-react";

import { useCookieConsent } from "@/hooks/use-cookie-consent";

export function CookieConsentBanner() {
  const { consent, setConsent } = useCookieConsent();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || consent !== null) return null;

  return (
    <div className="bg-muted/90 fixed right-6 bottom-6 z-50 max-w-md rounded-2xl border p-5 shadow-lg backdrop-blur-sm">
      <button
        onClick={() => setConsent("rejected")}
        className="hover:bg-accent absolute top-3 right-3 rounded-md p-1"
        aria-label="Close">
        <X className="text-muted-foreground h-5 w-5" />
      </button>
      <p className="font-display mb-2 text-lg font-semibold tracking-tight">
        🍪 We value your privacy
      </p>
      <p className="font-display text-muted-foreground mb-4 text-sm">
        We use cookies to analyze traffic and improve your experience.{" "}
        <Link href="/cookies" className="font-display text-foreground underline underline-offset-4">
          Cookie Policy
        </Link>
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => setConsent("rejected")}
          className="font-display bg-background hover:bg-accent flex-1 rounded-lg border px-3 py-2 text-sm font-medium">
          Reject
        </button>
        <button
          onClick={() => setConsent("accepted")}
          className="font-display bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-lg px-3 py-2 text-sm font-medium">
          Accept
        </button>
      </div>
    </div>
  );
}
