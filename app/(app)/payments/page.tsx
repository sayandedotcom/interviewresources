import { siteConfig } from "@/site";

import { MAX_RUN_CREDITS, MIN_RUN_CREDITS } from "@/lib/credits";

import { PricingPlans } from "@/features/payments/pricing-plans";

export default function PaymentsPage() {
  if (!siteConfig.enablePayments) {
    return (
      <div className="container py-16 text-center">
        <h1 className="font-display mb-4 text-2xl font-bold">Payments</h1>
        <p className="font-display text-muted-foreground">Payments are currently disabled.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-16">
      <div className="text-center">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Credits</h1>
        <p className="font-display text-muted-foreground mx-auto mt-4 max-w-2xl text-base leading-relaxed">
          A report is billed at what it actually costs to research — typically about 46 credits, and
          never more than {MAX_RUN_CREDITS} or your remaining balance, whichever is lower. You need
          at least {MIN_RUN_CREDITS} credits to start one.
        </p>
      </div>

      <div className="mt-14">
        <PricingPlans />
      </div>
    </div>
  );
}
