"use client";

import * as React from "react";

import Link from "next/link";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useCookieConsent } from "@/hooks/use-cookie-consent";

export function CookieConsentBanner() {
  const { consent, setConsent } = useCookieConsent();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <AlertDialog open={mounted && consent === null} onOpenChange={() => {}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>🍪 We value your privacy</AlertDialogTitle>
          <AlertDialogDescription>
            We use cookies to analyze traffic and improve your experience. See our{" "}
            <Link href="/cookies" className="text-foreground underline underline-offset-4">
              Cookie Policy
            </Link>{" "}
            for details.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConsent("rejected")}>Reject</AlertDialogCancel>
          <AlertDialogAction onClick={() => setConsent("accepted")}>Accept</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
