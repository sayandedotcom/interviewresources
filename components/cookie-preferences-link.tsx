"use client";

import { useCookieConsent } from "@/hooks/use-cookie-consent";

export function CookiePreferencesLink() {
  const { setConsent } = useCookieConsent();

  return (
    <button
      type="button"
      onClick={() => setConsent(null)}
      className="font-display text-muted-foreground hover:text-foreground text-sm transition-colors">
      Cookie Preferences
    </button>
  );
}
