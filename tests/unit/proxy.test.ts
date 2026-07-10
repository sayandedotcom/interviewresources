import { NextRequest } from "next/server";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/site", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/site")>();
  return { siteConfig: { ...actual.siteConfig, activeAuth: true } };
});

const { siteConfig } = await import("@/site");
const { EXPIRED_PARAM, config, proxy } = await import("@/proxy");

/** better-auth's default cookie, which is all the proxy is allowed to look at. */
const SESSION_COOKIE = "better-auth.session_token";

function request(path: string, { signedIn = false } = {}) {
  const req = new NextRequest(new URL(path, "http://test.local"));
  if (signedIn) req.cookies.set(SESSION_COOKIE, "a-token-value");
  return req;
}

/** Where a response sends the caller, or null when it lets the request through. */
function destination(res: Response): string | null {
  const location = res.headers.get("location");
  return location ? new URL(location).pathname + new URL(location).search : null;
}

beforeEach(() => {
  vi.clearAllMocks();
  siteConfig.activeAuth = true;
});

describe("protecting /prepare", () => {
  it("turns an anonymous visitor away from the app", () => {
    expect(destination(proxy(request("/prepare")))).toBe("/");
  });

  it("turns them away from a report they were linked to", () => {
    expect(destination(proxy(request("/prepare/some-research-id")))).toBe("/");
  });

  it("lets a visitor holding a session cookie through", () => {
    expect(destination(proxy(request("/prepare", { signedIn: true })))).toBeNull();
  });

  it("matches the app routes it claims to protect", () => {
    expect(config.matcher).toContain("/prepare");
    expect(config.matcher).toContain("/prepare/:path*");
  });
});

describe("sending signed-in users to the app", () => {
  it("redirects an authenticated visitor off the landing page", () => {
    expect(destination(proxy(request("/", { signedIn: true })))).toBe("/prepare");
  });

  it("leaves an anonymous visitor on the landing page", () => {
    expect(destination(proxy(request("/")))).toBeNull();
  });

  it("does not touch other marketing pages a signed-in user may want", () => {
    // /pricing is outside the matcher, but the handler must be harmless anyway.
    expect(destination(proxy(request("/pricing", { signedIn: true })))).toBeNull();
  });
});

describe("stale cookies", () => {
  /**
   * A cookie can outlive the session it names — revoked, or purged from the
   * database. The layout catches that and redirects back to `/`. If the proxy
   * then bounced it to `/prepare` again, the two would loop until the browser
   * gave up.
   */
  it("stops redirecting to the app once the layout has rejected the cookie", () => {
    const req = request(`/?${EXPIRED_PARAM}=expired`, { signedIn: true });

    expect(destination(proxy(req))).toBeNull();
  });

  it("still redirects when some unrelated query string is present", () => {
    expect(destination(proxy(request("/?ref=twitter", { signedIn: true })))).toBe("/prepare");
  });
});

describe("with auth switched off", () => {
  it("gates nothing, rather than locking the app behind a door nobody can open", () => {
    siteConfig.activeAuth = false;

    expect(destination(proxy(request("/prepare")))).toBeNull();
    expect(destination(proxy(request("/", { signedIn: true })))).toBeNull();
  });
});
