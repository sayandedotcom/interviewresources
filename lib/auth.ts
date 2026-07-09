import { env } from "@/env";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { siteConfig } from "../site";
import { db } from "./db/index";
import * as schema from "./db/schema";

export const auth = siteConfig.activeAuth
  ? betterAuth({
      database: drizzleAdapter(db, { provider: "pg", schema, usePlural: true }),
      secret: env.BETTER_AUTH_SECRET,
      baseURL: env.NEXT_PUBLIC_SITE_URL,
      emailAndPassword: {
        enabled: false,
      },
      socialProviders: {
        google: {
          clientId: env.GOOGLE_CLIENT_ID!,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
        },
      },
      advanced: {
        database: { generateId: "uuid" },
      },
      plugins: [nextCookies()],
    })
  : null;
