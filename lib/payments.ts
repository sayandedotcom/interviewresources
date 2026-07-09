import { env } from "@/env";

import { siteConfig } from "../site";

type DodoEnvironment = "test_mode" | "live_mode";

export const dodoPaymentsConfig = siteConfig.enablePayments
  ? {
      bearerToken: env.DODO_PAYMENTS_API_KEY!,
      webhookKey: env.DODO_PAYMENTS_WEBHOOK_KEY!,
      returnUrl: `${env.NEXT_PUBLIC_SITE_URL}/payments/success`,
      environment: (env.DODO_PAYMENTS_ENVIRONMENT ?? "test_mode") as DodoEnvironment,
    }
  : null;
