import { siteConfig } from "@/site";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BuyCreditsButton } from "@/features/payments/buy-credits-button";
import { MAX_RUN_CREDITS, MIN_RUN_CREDITS } from "@/lib/credits";

export default function PaymentsPage() {
  if (!siteConfig.enablePayments) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Payments</h1>
        <p className="text-muted-foreground">Payments are currently disabled.</p>
      </div>
    );
  }

  return (
    <div className="container py-16">
      <h1 className="text-3xl font-bold text-center mb-2">Credits</h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        A report is billed at what it actually costs to research — typically about 46 credits, and
        never more than {MAX_RUN_CREDITS} or your remaining balance, whichever is lower. You need at
        least {MIN_RUN_CREDITS} credits to start one.
      </p>
      <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {siteConfig.pricingPlans.map((plan) => (
          <Card key={plan.slug}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold mb-4">${plan.price}</p>
              <ul className="space-y-2 mb-6">
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
