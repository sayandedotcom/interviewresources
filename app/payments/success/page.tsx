"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Credits are granted by the Dodo webhook, which can land a moment after the
 * redirect. Poll a few times before telling the user their balance.
 */
export default function PaymentSuccessPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      attempts += 1;
      try {
        const res = await fetch("/api/me");
        const data = await res.json();
        if (cancelled) return;

        if (data.signedIn) {
          setBalance(data.balance);
          if (data.balance > 0) {
            setSettled(true);
            return;
          }
        }
      } catch {
        // fall through to retry
      }

      if (!cancelled && attempts < 6) {
        setTimeout(poll, 1500);
      } else if (!cancelled) {
        setSettled(true);
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container py-16">
      <Card className="mx-auto max-w-md">
        <CardContent className="py-8 text-center">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Payment received</h1>

          {!settled && (
            <p className="mt-3 text-sm text-muted-foreground">Adding your credits…</p>
          )}

          {settled && balance !== null && balance > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              Your balance is now{" "}
              <span className="font-mono text-foreground">{balance} credits</span>.
            </p>
          )}

          {settled && (balance === null || balance === 0) && (
            <p className="mt-3 text-sm text-muted-foreground">
              Your credits are still being applied. They should appear within a minute — refresh the
              page if they don&apos;t.
            </p>
          )}

          <Link href="/" className="mt-6 inline-block">
            <Button>Start a report</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
