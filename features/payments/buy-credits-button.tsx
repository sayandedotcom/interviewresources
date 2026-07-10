"use client";

import { useState } from "react";

import { pricingConfig } from "@/config/pricing";

import { Button } from "@/components/ui/button";

import { signInWithGoogle, useSession } from "@/lib/auth-client";

/** Derived so a new pack in pricingConfig cannot drift from what checkout accepts. */
type PlanSlug = (typeof pricingConfig.plans)[number]["slug"];

/** Starts a Dodo checkout for a credit pack, or signs the user in first. */
export function BuyCreditsButton({
  plan,
  children,
  className,
  variant,
}: {
  plan: PlanSlug;
  children: React.ReactNode;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const { data: session } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!session) {
      await signInWithGoogle();
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.detail ?? data.error ?? "Checkout is unavailable.");
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <Button className={className} variant={variant} onClick={onClick} disabled={busy}>
        {busy ? "Opening checkout…" : children}
      </Button>
      {error && <p className="text-destructive mt-2 text-xs">{error}</p>}
    </div>
  );
}
