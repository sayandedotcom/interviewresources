import { notFound } from "next/navigation";

import { env } from "@/env";

import { type SessionUser, getCurrentUser } from "@/lib/session";

/** Parsed once per call — ADMIN_EMAILS is small and this runs on the server only. */
function adminEmails(): Set<string> {
  return new Set(
    (env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Fails closed: an unset or empty ADMIN_EMAILS means no one is admin, even a
 * signed-in user. There is no `role` column — this env allowlist is the only
 * gate, so an accidental empty value must deny rather than allow.
 */
export function isAdmin(user: SessionUser | null): boolean {
  if (!user) return false;
  return adminEmails().has(user.email.toLowerCase());
}

/**
 * Resolves the signed-in admin for a server component, or 404s. 404 rather
 * than redirect so a signed-in non-admin can't tell the route exists.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) notFound();
  return user;
}
