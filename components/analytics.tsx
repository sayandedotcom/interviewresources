"use client";

import { env } from "@/env";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";

import { useCookieConsent } from "@/hooks/use-cookie-consent";

export function Analytics() {
  const { consent } = useCookieConsent();

  if (consent !== "accepted") {
    return null;
  }

  return (
    <>
      {env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={env.NEXT_PUBLIC_GA_ID} />}
      <VercelAnalytics />
    </>
  );
}
