import { type NextRequest, NextResponse } from "next/server";

import { siteConfig } from "@/site";
import { getSessionCookie } from "better-auth/cookies";

/** The landing page carries this when a stale cookie has just been rejected. */
export const EXPIRED_PARAM = "session";

/** Query param on a referral link, and the cookie it is stashed in until signup. */
export const REFERRAL_PARAM = "ref";
export const REFERRAL_COOKIE = "referral_code";

/** How long a captured referral code survives before the visitor must click again. */
const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

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

  const response = NextResponse.next();

  // A referral link is `…/?ref=CODE`. The code has to survive the round-trip to
  // Google and back, which drops query params, so we stash it in a cookie now
  // and the signup hook reads it later. Only for signed-out visitors: an
  // existing user clicking a friend's link is not a new referral.
  const referralCode = searchParams.get(REFERRAL_PARAM);
  if (referralCode && !signedIn) {
    response.cookies.set(REFERRAL_COOKIE, referralCode, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: REFERRAL_COOKIE_MAX_AGE,
    });
  }

  return response;
}

export const config = {
  matcher: ["/", "/signin", "/prepare", "/prepare/:path*"],
};
