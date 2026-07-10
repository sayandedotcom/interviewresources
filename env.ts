import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Locally and in CI most of these are absent, and the app degrades gracefully
 * (payments off, auth off, tests inject dummies). In a production deploy an
 * absent secret is a bug, and we want it to fail the build rather than a user's
 * request — so on Vercel's production environment the real ones become required.
 */
const isProdDeploy = process.env.VERCEL_ENV === "production";

function req<T extends z.ZodTypeAny>(schema: T) {
  return isProdDeploy ? schema : schema.optional();
}

export const env = createEnv({
  server: {
    DATABASE_URL: req(z.string().url()),
    /**
     * Neon's direct (non-pooled) endpoint. Migrations and drizzle-kit need
     * session-level connections, which the transaction-mode pooler cannot give.
     * Never used to serve requests.
     */
    DATABASE_URL_UNPOOLED: z.string().url().optional(),
    BETTER_AUTH_SECRET: req(z.string().min(1)),
    BETTER_AUTH_URL: z.string().url().optional(),
    GOOGLE_CLIENT_SECRET: req(z.string().min(1)),
    GOOGLE_CLIENT_ID: req(z.string().min(1)),
    /** Read implicitly by @ai-sdk/google in lib/research/gemini.ts. */
    GOOGLE_GENERATIVE_AI_API_KEY: req(z.string().min(1)),
    TAVILY_API_KEY: req(z.string().min(1)),
    DODO_PAYMENTS_API_KEY: req(z.string().min(1)),
    DODO_PAYMENTS_WEBHOOK_KEY: req(z.string().min(1)),
    DODO_PAYMENTS_ENVIRONMENT: z.enum(["test_mode", "live_mode"]).optional(),
    DODO_PRODUCT_ID_STARTER: req(z.string().min(1)),
    DODO_PRODUCT_ID_BUNDLE: req(z.string().min(1)),
    DODO_PRODUCT_ID_MAX: req(z.string().min(1)),
    INNGEST_EVENT_KEY: z.string().min(1).optional(),
    INNGEST_SIGNING_KEY: z.string().min(1).optional(),
    /** Injected by Vercel Cron. Guards /api/cron/*, which is otherwise public. */
    CRON_SECRET: z.string().min(1).optional(),
    /** Comma-separated emails allowed into /admin. Unset means no one is admin. */
    ADMIN_EMAILS: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_SITE_URL: req(z.string().url()),
    NEXT_PUBLIC_GA_ID: z.string().min(1).optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    DODO_PAYMENTS_API_KEY: process.env.DODO_PAYMENTS_API_KEY,
    DODO_PAYMENTS_WEBHOOK_KEY: process.env.DODO_PAYMENTS_WEBHOOK_KEY,
    DODO_PAYMENTS_ENVIRONMENT: process.env.DODO_PAYMENTS_ENVIRONMENT,
    DODO_PRODUCT_ID_STARTER: process.env.DODO_PRODUCT_ID_STARTER,
    DODO_PRODUCT_ID_BUNDLE: process.env.DODO_PRODUCT_ID_BUNDLE,
    DODO_PRODUCT_ID_MAX: process.env.DODO_PRODUCT_ID_MAX,
    INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
    INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
  },
  emptyStringAsUndefined: true,
});
