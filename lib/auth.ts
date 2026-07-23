import { cookies } from "next/headers";

import { env } from "@/env";
import { REFERRAL_COOKIE } from "@/proxy";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";

import { siteConfig } from "../site";
import { db } from "./db/index";
import * as schema from "./db/schema";
import { recordProductEvent } from "./events";
import { resolveReferrerByCode } from "./referrals";

/**
 * Attributes a brand-new user to a referrer, if they arrived through a referral
 * link. The `?ref=CODE` was stashed in a cookie by the proxy before the Google
 * round-trip; here we resolve it and record `referredBy`. No credits move yet —
 * the payout waits for the referred user's first purchase.
 *
 * Everything is best-effort and swallowed: a broken referral must never keep a
 * legitimate signup from completing.
 */
async function attributeReferral(newUserId: string): Promise<void> {
  try {
    const store = await cookies();
    const code = store.get(REFERRAL_COOKIE)?.value;
    if (!code) return;

    const referrerId = await resolveReferrerByCode(code);
    // A code that resolves to nothing, or (defensively) to the new user itself,
    // is simply ignored — but the cookie is still cleared below either way.
    if (referrerId && referrerId !== newUserId) {
      await db
        .update(schema.users)
        .set({ referredBy: referrerId })
        .where(eq(schema.users.id, newUserId));
    }

    try {
      store.delete(REFERRAL_COOKIE);
    } catch {
      // Some request contexts expose read-only cookies; a stale referral cookie
      // is harmless since attribution only ever fires on user creation.
    }
  } catch (error) {
    console.error("referral attribution failed", error);
  }
}

export const auth = siteConfig.activeAuth
  ? betterAuth({
      database: drizzleAdapter(db, { provider: "pg", schema, usePlural: true }),
      secret: env.BETTER_AUTH_SECRET,
      baseURL: env.BETTER_AUTH_URL ?? env.NEXT_PUBLIC_SITE_URL,
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
      databaseHooks: {
        session: {
          create: {
            after: async (session) => {
              await recordProductEvent("sign_in", session.userId);
            },
          },
        },
        user: {
          create: {
            after: async (user) => {
              await attributeReferral(user.id);
            },
          },
        },
      },
      plugins: [nextCookies()],
    })
  : null;
