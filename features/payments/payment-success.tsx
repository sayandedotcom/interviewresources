"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The return-URL screen. Dodo appends `status` and `payment_id`, and both
 * matter: a failed payment lands here exactly like a successful one, so
 * rendering "Payment received" unconditionally tells a user who was never
 * charged to sit and wait for credits that are never coming.
 *
 * Settlement is decided by whether *this* payment reached the ledger, not by
 * the balance. A returning customer already has credits when they arrive, so a
 * balance check cannot distinguish a settled purchase from an unsettled one.
 */

/** Terminal states Dodo redirects with. Anything else is still in flight. */
const FAILED_STATUSES = new Set(["failed", "cancelled", "canceled"]);

const MAX_ATTEMPTS = 6;
const POLL_INTERVAL_MS = 1500;

export function PaymentSuccess({ status, paymentId }: { status?: string; paymentId?: string }) {
  const failed = status != null && FAILED_STATUSES.has(status.toLowerCase());

  const [balance, setBalance] = useState<number | null>(null);
  const [credited, setCredited] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    // Nothing to wait for: no payment was taken.
    if (failed) return;

    let cancelled = false;
    let attempts = 0;

    async function poll() {
      attempts += 1;
      try {
        const res = await fetch(
          paymentId ? `/api/me?payment_id=${encodeURIComponent(paymentId)}` : "/api/me"
        );
        const data = await res.json();
        if (cancelled) return;

        if (data.signedIn) {
          setBalance(data.balance);

          // Without a payment id there is nothing to match on, so fall back to
          // the balance being positive — the best available signal.
          const landed = paymentId ? data.credited === true : data.balance > 0;
          if (landed) {
            setCredited(true);
            setSettled(true);
            return;
          }
        }
      } catch {
        // fall through to retry
      }

      if (!cancelled && attempts < MAX_ATTEMPTS) {
        setTimeout(poll, POLL_INTERVAL_MS);
      } else if (!cancelled) {
        setSettled(true);
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [failed, paymentId]);

  if (failed) {
    return (
      <div className="container py-16">
        <Card className="mx-auto max-w-md">
          <CardContent className="py-8 text-center">
            <h1 className="font-display text-2xl font-semibold tracking-tight">Payment failed</h1>
            <p className="text-muted-foreground mt-3 text-sm">
              You have not been charged and no credits were added. You can try again with a
              different payment method.
            </p>
            <Link href="/payments" className="mt-6 inline-block">
              <Button>Back to credits</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-16">
      <Card className="mx-auto max-w-md">
        <CardContent className="py-8 text-center">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Payment received</h1>

          {!settled && <p className="text-muted-foreground mt-3 text-sm">Adding your credits…</p>}

          {settled && credited && balance !== null && (
            <p className="text-muted-foreground mt-3 text-sm">
              Your balance is now <span className="text-foreground">{balance} credits</span>.
            </p>
          )}

          {settled && !credited && (
            <p className="text-muted-foreground mt-3 text-sm">
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
