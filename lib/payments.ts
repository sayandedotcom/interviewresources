import { siteConfig } from "../site";

type DodoEnvironment = "test_mode" | "live_mode";

export const dodoPaymentsConfig = siteConfig.enablePayments
  ? {
      bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
      webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY!,
      returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/payments/success`,
      environment: (process.env.DODO_PAYMENTS_ENVIRONMENT ?? "test_mode") as DodoEnvironment,
    }
  : null;
