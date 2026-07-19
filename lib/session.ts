import { cache } from "react";

import { headers as requestHeaders } from "next/headers";

import { auth } from "./auth";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

/**
 * Resolves the signed-in user for a route handler, or null.
 *
 * `getSession` already joins the session to its user row, so the fields below
 * come straight off it — a second `select` from `users` would be a redundant
 * round-trip, which is expensive against a remote database.
 */
export async function getSessionUser(headers: Headers): Promise<SessionUser | null> {
  if (!auth) return null;

  const session = await auth.api.getSession({ headers });
  if (!session?.user) return null;

  const { id, email, name, image } = session.user;
  return { id, email, name, image: image ?? null };
}

/**
 * The same lookup for server components, memoised for the lifetime of one
 * request. The `(app)` layout and the page it renders both need the user, and
 * without this each would pay for its own session round-trip. Takes no
 * arguments so every caller in a request shares the one cache entry.
 *
 * Route handlers have a `Request` in hand and should call `getSessionUser`
 * directly — `headers()` is only available while rendering.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  return getSessionUser(await requestHeaders());
});
