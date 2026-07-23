import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/session";

vi.mock("@/lib/session");
vi.mock("@/lib/events", () => ({ recordProductEvent: vi.fn() }));

const createSession = vi.fn();
vi.mock("dodopayments", () => ({
  default: class {
    checkoutSessions = { create: createSession };
    constructor(readonly opts: unknown) {}
  },
}));

const { getSessionUser } = await import("@/lib/session");
const { POST } = await import("./route");

const sessionMock = vi.mocked(getSessionUser);

const user: SessionUser = {
  id: "user-1",
  email: "ada@example.com",
  name: "Ada Lovelace",
  image: null,
};

function post(body: unknown) {
  return new Request("https://test.local/api/checkout", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.mockResolvedValue(user);
  createSession.mockResolvedValue({ checkout_url: "https://checkout.dodo/abc" });
});

describe("auth", () => {
  it("rejects an anonymous caller", async () => {
    sessionMock.mockResolvedValue(null);

    const res = await POST(post({ plan: "bundle" }));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "unauthenticated" });
    expect(createSession).not.toHaveBeenCalled();
  });
});

describe("plan validation", () => {
  it("rejects an unknown plan", async () => {
    const res = await POST(post({ plan: "enterprise" }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "unknown_plan" });
  });

  it("rejects a missing plan", async () => {
    expect((await POST(post({}))).status).toBe(400);
  });

  it("rejects a non-string plan without crashing on String()", async () => {
    expect((await POST(post({ plan: { evil: true } }))).status).toBe(400);
    expect((await POST(post({ plan: 42 }))).status).toBe(400);
    expect((await POST(post({ plan: null }))).status).toBe(400);
  });

  it("rejects a prototype key as an unknown plan, not a 500", async () => {
    // Regression: `CREDIT_PACKS["constructor"]` used to return Object's
    // constructor, which is truthy, so the handler fell through to the
    // productId check and answered 500 plan_unavailable.
    for (const plan of ["constructor", "toString", "__proto__", "valueOf"]) {
      const res = await POST(post({ plan }));
      expect(res.status, `plan=${plan}`).toBe(400);
      await expect(res.json()).resolves.toEqual({ error: "unknown_plan" });
    }
  });

  it("survives a malformed json body", async () => {
    const res = await POST(post("{ not json"));

    expect(res.status).toBe(400);
  });
});

describe("checkout session creation", () => {
  it("takes the userId from the session, never from the request body", async () => {
    await POST(post({ plan: "bundle", userId: "victim-account" }));

    expect(createSession).toHaveBeenCalledOnce();
    expect(createSession.mock.calls[0][0].metadata).toEqual({ userId: "user-1", plan: "bundle" });
  });

  it("sends the configured product id and the session's customer details", async () => {
    await POST(post({ plan: "starter" }));

    expect(createSession.mock.calls[0][0]).toMatchObject({
      product_cart: [{ product_id: "prod_starter", quantity: 1 }],
      customer: { email: "ada@example.com", name: "Ada Lovelace" },
      return_url: "https://test.local/payments/success",
    });
  });

  it("returns the checkout url on success", async () => {
    const res = await POST(post({ plan: "bundle" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ checkoutUrl: "https://checkout.dodo/abc" });
  });

  it("returns 502 when Dodo answers without a checkout url", async () => {
    createSession.mockResolvedValue({ checkout_url: null });

    const res = await POST(post({ plan: "bundle" }));

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({ error: "checkout_failed" });
  });

  it("does not swallow a Dodo API outage into a 200", async () => {
    createSession.mockRejectedValue(new Error("dodo 503"));

    // The handler has no try/catch, so this rejects and Next renders a 500.
    // Pinned so a future refactor cannot silently downgrade it to a fake success.
    await expect(POST(post({ plan: "bundle" }))).rejects.toThrow("dodo 503");
  });

  it("never quantifies more than one pack per checkout", async () => {
    await POST(post({ plan: "bundle", quantity: 99 }));

    expect(createSession.mock.calls[0][0].product_cart[0].quantity).toBe(1);
  });
});
