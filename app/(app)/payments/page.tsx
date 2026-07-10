import { siteConfig } from "@/site";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { MAX_RUN_CREDITS, MIN_RUN_CREDITS } from "@/lib/credits";

import { BuyCreditsButton } from "@/features/payments/buy-credits-button";

export default function PaymentsPage() {
  if (!siteConfig.enablePayments) {
    return (
      <div className="container py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold">Payments</h1>
        <p className="text-muted-foreground">Payments are currently disabled.</p>
      </div>
    );
  }

  return (
    <div className="container py-16">
      <h1 className="mb-2 text-center text-3xl font-bold">Credits</h1>
      <p className="text-muted-foreground mb-8 text-center text-sm">
        A report is billed at what it actually costs to research — typically about 46 credits, and
        never more than {MAX_RUN_CREDITS} or your remaining balance, whichever is lower. You need at
        least {MIN_RUN_CREDITS} credits to start one.
      </p>
      <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {siteConfig.pricingPlans.map((plan) => (
          <Card key={plan.slug}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-3xl font-bold">${plan.price}</p>
              <ul className="mb-6 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="text-sm">
                    {feature}
                  </li>
                ))}
              </ul>
              <BuyCreditsButton plan={plan.slug} className="w-full">
                Buy {plan.name}
              </BuyCreditsButton>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
