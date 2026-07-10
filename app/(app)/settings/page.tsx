import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { EXPIRED_PARAM } from "@/proxy";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/index";
import { users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";

import { SettingsClient } from "@/features/settings/settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getSessionUser(await headers());
  if (!user) redirect(`/?${EXPIRED_PARAM}=expired`);

  const [userRow] = await db
    .select({ marketingEmailOptIn: users.marketingEmailOptIn })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-16">
      <div className="mb-10 text-center">
        <p className="text-tertiary mb-2 font-mono text-[11px] tracking-[0.22em] uppercase">
          Account
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="font-display text-muted-foreground mt-3 text-sm">
          Manage your account settings and preferences.
        </p>
      </div>

      <SettingsClient userId={user.id} />
    </div>
  );
}
