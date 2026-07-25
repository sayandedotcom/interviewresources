"use client";

import { useCookieConsent } from "@/hooks/use-cookie-consent";

export function CookiePreferencesLink() {
  const { setConsent } = useCookieConsent();

  return (
    <button
      type="button"
      onClick={() => setConsent(null)}
      className="font-display text-muted-foreground hover:text-foreground flex min-h-11 cursor-pointer items-center text-base transition-colors">
      Cookie Preferences
    </button>
  );
}
