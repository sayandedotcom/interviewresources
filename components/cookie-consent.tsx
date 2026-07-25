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
    /* Pinned to the bottom edge on mobile rather than floating inset: at 390px
       the old `max-w-md` card took roughly a third of the viewport and sat on
       top of the hero's secondary CTA. Compact copy + a tighter mobile footprint
       keeps the CTA reachable; the desktop card is unchanged. */
    <div className="bg-muted/95 fixed inset-x-3 bottom-3 z-50 rounded-2xl border p-4 shadow-lg backdrop-blur-sm sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-md sm:p-5">
      <button
        onClick={() => setConsent("rejected")}
        className="hover:bg-accent absolute top-1.5 right-1.5 flex h-11 w-11 items-center justify-center rounded-md"
        aria-label="Close">
        <X className="text-muted-foreground h-5 w-5" />
      </button>
      <p className="font-display mb-1.5 pr-10 text-base font-semibold tracking-tight sm:text-lg">
        🍪 We value your privacy
      </p>
      <p className="font-display text-muted-foreground mb-3 text-sm">
        We use cookies to analyze traffic and improve your experience.{" "}
        <Link href="/cookies" className="font-display text-foreground underline underline-offset-4">
          Cookie Policy
        </Link>
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => setConsent("rejected")}
          className="font-display bg-background hover:bg-accent min-h-11 flex-1 rounded-lg border px-3 text-sm font-medium">
          Reject
        </button>
        <button
          onClick={() => setConsent("accepted")}
          className="font-display bg-primary text-primary-foreground hover:bg-primary/90 min-h-11 flex-1 rounded-lg px-3 text-sm font-medium">
          Accept
        </button>
      </div>
    </div>
  );
}
