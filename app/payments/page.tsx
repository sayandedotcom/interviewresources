import { siteConfig } from "@/site";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
      <h1 className="text-3xl font-bold text-center mb-8">Credits</h1>
      <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {siteConfig.pricingPlans.map((plan) => (
          <Card key={plan.name}>
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
              <Button
                className="w-full"
                onClick={() => {
                  const params = new URLSearchParams({ productId: plan.name });
                  window.location.href = `/api/checkout?${params}`;
                }}
              >
                Buy {plan.name}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
