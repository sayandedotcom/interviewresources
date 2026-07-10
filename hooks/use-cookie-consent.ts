"use client";

import * as React from "react";

export type CookieConsent = "accepted" | "rejected" | null;

export const COOKIE_CONSENT_STORAGE_KEY = "cookie-consent";
export const COOKIE_CONSENT_EVENT = "cookie-consent-change";

function readStoredConsent(): CookieConsent {
  const value = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  return value === "accepted" || value === "rejected" ? value : null;
}

export function useCookieConsent() {
  const [consent, setConsentState] = React.useState<CookieConsent>(null);

  React.useEffect(() => {
    setConsentState(readStoredConsent());

    const onChange = (event: Event) => {
      setConsentState((event as CustomEvent<CookieConsent>).detail);
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, onChange);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onChange);
  }, []);

  const setConsent = React.useCallback((value: CookieConsent) => {
    if (value === null) {
      window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
    } else {
      window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, value);
    }
    setConsentState(value);
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: value }));
  }, []);

  return { consent, setConsent };
}
