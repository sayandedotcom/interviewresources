import { betterAuth } from "better-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db/index";
import { siteConfig } from "../site";

export const auth = siteConfig.activeAuth
  ? betterAuth({
      database: DrizzleAdapter(db),
      emailAndPassword: {
        enabled: false,
      },
      socialProviders: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      },
    })
  : null;
