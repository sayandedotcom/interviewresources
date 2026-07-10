import { expect, test } from "@playwright/test";

/**
 * The report page is an async Server Component, so its authorization cannot be
 * unit tested. Its `and(eq(researches.id, id), eq(researches.userId, user.id))`
 * clause is the only thing standing between a signed-in user and every other
 * user's scouting report — an IDOR if it ever regresses to id-only.
 *
 * Signing in requires Google OAuth, so these tests need a seeded session cookie.
 * `tests/e2e/fixtures.ts` is the place to mint one against a scratch database;
 * until that exists, the anonymous paths below still guard the redirect.
 */

test.describe("anonymous access", () => {
  test("redirects an anonymous visitor away from a report", async ({ page }) => {
    await page.goto("/prepare/00000000-0000-0000-0000-000000000000");

    await expect(page).toHaveURL("/");
  });

  test("redirects rather than leaking whether a report id exists", async ({ page }) => {
    // Same destination for a real id and a fake one: no oracle.
    await page.goto("/prepare/11111111-1111-1111-1111-111111111111");

    await expect(page).toHaveURL("/");
  });

  test("the research API rejects an unauthenticated POST", async ({ request }) => {
    const res = await request.post("/api/research", {
      data: { companyName: "Stripe", interviewTypes: ["dsa"] },
    });

    expect(res.status()).toBe(401);
  });

  test("the checkout API rejects an unauthenticated POST", async ({ request }) => {
    const res = await request.post("/api/checkout", { data: { plan: "bundle" } });

    expect(res.status()).toBe(401);
  });

  test("/api/me reports signed-out with a zero balance", async ({ request }) => {
    const body = await (await request.get("/api/me")).json();

    expect(body).toMatchObject({ signedIn: false, balance: 0 });
  });

  test("/api/researches leaks no sessions to an anonymous caller", async ({ request }) => {
    const body = await (await request.get("/api/researches")).json();

    expect(body).toEqual({ sessions: [] });
  });
});

test.describe("webhook signature verification", () => {
  test("rejects an unsigned payload, so credits cannot be minted by anyone", async ({ request }) => {
    const res = await request.post("/api/webhook/dodo-payments", {
      data: {
        type: "payment.succeeded",
        data: {
          status: "succeeded",
          payment_id: "pay_forged",
          metadata: { userId: "victim" },
          product_cart: [{ product_id: "prod_bundle", quantity: 1 }],
        },
      },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("rejects a payload with a bogus signature header", async ({ request }) => {
    const res = await request.post("/api/webhook/dodo-payments", {
      headers: {
        "webhook-id": "msg_1",
        "webhook-signature": "v1,not-a-real-signature",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
      },
      data: { type: "payment.succeeded", data: { status: "succeeded", payment_id: "pay_x" } },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe("marketing surface", () => {
  test("the landing page renders", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("pricing shows every credit pack", async ({ page }) => {
    await page.goto("/pricing");

    await expect(page.getByText(/starter/i).first()).toBeVisible();
    await expect(page.getByText(/bundle/i).first()).toBeVisible();
    await expect(page.getByText(/max/i).first()).toBeVisible();
  });

  test("robots and sitemap are served", async ({ request }) => {
    expect((await request.get("/robots.txt")).status()).toBe(200);
    expect((await request.get("/sitemap.xml")).status()).toBe(200);
  });
});
