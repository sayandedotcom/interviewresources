import { type NextRequest, NextResponse } from "next/server";

import { siteConfig } from "@/site";
import { getSessionCookie } from "better-auth/cookies";

/** The landing page carries this when a stale cookie has just been rejected. */
export const EXPIRED_PARAM = "session";

/**
 * An optimistic gate. It reads the session cookie and never the database,
 * because a proxy runs on every request — prefetches included — and a query per
 * request would be felt on every link hover.
 *
 * That makes it a filter, not an authorization boundary: a cookie that merely
 * *exists* passes. The authoritative check lives in the `/prepare` layout, which
 * resolves the session against the database and redirects when it comes up
 * empty. See the Next.js authentication guide, "Optimistic checks with Proxy".
 */
export function proxy(request: NextRequest) {
  // With auth switched off nobody can hold a session cookie, and gating on one
  // would lock the whole app behind a door that cannot be opened.
  if (!siteConfig.activeAuth) return NextResponse.next();

  const { pathname, searchParams } = request.nextUrl;
  const signedIn = getSessionCookie(request) != null;

  if (pathname.startsWith("/prepare") && !signedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // The `session` param is what the layout adds when it rejects a cookie whose
  // session is gone. Without honouring it here, that redirect and this one would
  // trade the request back and forth forever.
  if (pathname === "/" && signedIn && !searchParams.has(EXPIRED_PARAM)) {
    return NextResponse.redirect(new URL("/prepare", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/prepare", "/prepare/:path*"],
};
