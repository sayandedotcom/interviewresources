import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db/index";
import * as schema from "./db/schema";
import { siteConfig } from "../site";

export const auth = siteConfig.activeAuth
  ? betterAuth({
      // Our tables are plural (`users`, `sessions`, …) while better-auth's
      // models are singular, hence usePlural.
      database: drizzleAdapter(db, { provider: "pg", schema, usePlural: true }),
      secret: process.env.BETTER_AUTH_SECRET,
      baseURL: process.env.NEXT_PUBLIC_SITE_URL,
      emailAndPassword: {
        enabled: false,
      },
      socialProviders: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      },
      // Our id columns are `uuid`; without this better-auth mints its own
      // random string ids and every insert fails.
      advanced: {
        database: { generateId: "uuid" },
      },
      // Must stay last: lets route handlers set auth cookies.
      plugins: [nextCookies()],
    })
  : null;
