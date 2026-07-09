import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The webhook is the only path that creates credits, and Dodo redelivers. The
 * two properties that matter: a redelivery must never double-grant, and a
 * payment must never be credited to the wrong account.
 *
 * `Webhooks()` from @dodopayments/nextjs owns signature verification. We stub it
 * to capture the `onPaymentSucceeded` handler and call it directly — signature
 * checking is the vendor's job and is covered by the E2E suite instead.
 */

type PaymentHandler = (payload: { data: Record<string, unknown> }) => Promise<void>;

let captured: PaymentHandler;

vi.mock("@dodopayments/nextjs", () => ({
  Webhooks: (opts: { onPaymentSucceeded: PaymentHandler }) => {
    captured = opts.onPaymentSucceeded;
    return async () => new Response(null, { status: 200 });
  },
}));

vi.mock("@/lib/credits", () => ({ grantCredits: vi.fn() }));

const selectWhere = vi.fn();
const updateWhere = vi.fn();
const updateSet = vi.fn(() => ({ where: updateWhere }));
vi.mock("@/lib/db/index", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: selectWhere }) }) }),
    update: () => ({ set: updateSet }),
  },
}));

const { grantCredits } = await import("@/lib/credits");
const { POST } = await import("./route");

const grantMock = vi.mocked(grantCredits);

/** Runs the route once so `Webhooks()` is constructed and the handler captured. */
async function handler(): Promise<PaymentHandler> {
  await POST(new Request("https://test.local/api/webhook/dodo-payments", { method: "POST" }) as never);
  return captured;
}

function payment(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      status: "succeeded",
      payment_id: "pay_123",
      metadata: { userId: "user-1" },
      customer: { email: "ada@example.com" },
      product_cart: [{ product_id: "prod_basic", quantity: 1 }],
      ...overrides,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  grantMock.mockResolvedValue(true);
  selectWhere.mockResolvedValue([]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("payment status", () => {
  it("ignores a payload whose status is not succeeded", async () => {
    await (await handler())(payment({ status: "failed" }));

    expect(grantMock).not.toHaveBeenCalled();
  });
});

describe("attribution", () => {
  it("credits the userId from server-set metadata", async () => {
    await (await handler())(payment());

    expect(grantMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", paymentRef: "pay_123" })
    );
  });

  it("prefers metadata over the customer email, even when they disagree", async () => {
    // The email fallback can mis-credit if a Dodo email matches another account.
    // Metadata is set by our own checkout route and must win.
    selectWhere.mockResolvedValue([{ id: "someone-else" }]);

    await (await handler())(payment());

    expect(grantMock.mock.calls[0][0].userId).toBe("user-1");
  });

  it("falls back to the customer email when metadata carries no userId", async () => {
    selectWhere.mockResolvedValue([{ id: "user-by-email" }]);

    await (await handler())(payment({ metadata: {} }));

    expect(grantMock.mock.calls[0][0].userId).toBe("user-by-email");
  });

  it("ignores a non-string userId in metadata rather than crediting it", async () => {
    selectWhere.mockResolvedValue([{ id: "user-by-email" }]);

    await (await handler())(payment({ metadata: { userId: 42 } }));

    expect(grantMock.mock.calls[0][0].userId).toBe("user-by-email");
  });

  it("ignores an empty-string userId in metadata", async () => {
    selectWhere.mockResolvedValue([{ id: "user-by-email" }]);

    await (await handler())(payment({ metadata: { userId: "" } }));

    expect(grantMock.mock.calls[0][0].userId).toBe("user-by-email");
  });

  it("grants nothing when the payment cannot be attributed to anyone", async () => {
    selectWhere.mockResolvedValue([]);

    await (await handler())(payment({ metadata: {}, customer: undefined }));

    expect(grantMock).not.toHaveBeenCalled();
  });

  it("returns normally on an unattributable payment so Dodo stops retrying", async () => {
    selectWhere.mockResolvedValue([]);

    await expect((await handler())(payment({ metadata: {}, customer: {} }))).resolves.toBeUndefined();
  });

  it("tolerates a missing metadata key entirely", async () => {
    selectWhere.mockResolvedValue([{ id: "user-by-email" }]);

    await (await handler())(payment({ metadata: undefined }));

    expect(grantMock.mock.calls[0][0].userId).toBe("user-by-email");
  });
});

describe("cart to credits", () => {
  it("grants 100 credits for a Basic pack", async () => {
    await (await handler())(payment());

    expect(grantMock.mock.calls[0][0]).toMatchObject({ credits: 100, reason: "purchase:basic" });
  });

  it("grants 500 credits for a Pro pack", async () => {
    await (await handler())(payment({ product_cart: [{ product_id: "prod_pro", quantity: 1 }] }));

    expect(grantMock.mock.calls[0][0]).toMatchObject({ credits: 500, reason: "purchase:pro" });
  });

  it("multiplies by quantity", async () => {
    await (await handler())(payment({ product_cart: [{ product_id: "prod_basic", quantity: 3 }] }));

    expect(grantMock.mock.calls[0][0].credits).toBe(300);
  });

  it("treats a zero quantity as one rather than granting nothing", async () => {
    await (await handler())(payment({ product_cart: [{ product_id: "prod_basic", quantity: 0 }] }));

    expect(grantMock.mock.calls[0][0].credits).toBe(100);
  });

  it("sums a mixed cart and names both packs in the reason", async () => {
    await (await handler())(
      payment({
        product_cart: [
          { product_id: "prod_basic", quantity: 1 },
          { product_id: "prod_pro", quantity: 2 },
        ],
      })
    );

    expect(grantMock.mock.calls[0][0]).toMatchObject({
      credits: 1100, // 100 + 500*2
      reason: "purchase:basic+pro",
    });
  });

  it("silently drops an unknown product from a mixed cart", async () => {
    await (await handler())(
      payment({
        product_cart: [
          { product_id: "prod_unknown", quantity: 1 },
          { product_id: "prod_basic", quantity: 1 },
        ],
      })
    );

    expect(grantMock.mock.calls[0][0].credits).toBe(100);
  });

  it("grants nothing when the cart holds no product we sell", async () => {
    await (await handler())(payment({ product_cart: [{ product_id: "prod_x", quantity: 1 }] }));

    expect(grantMock).not.toHaveBeenCalled();
  });

  it("grants nothing for an empty cart", async () => {
    await (await handler())(payment({ product_cart: [] }));

    expect(grantMock).not.toHaveBeenCalled();
  });

  it("tolerates a missing product_cart", async () => {
    await (await handler())(payment({ product_cart: undefined }));

    expect(grantMock).not.toHaveBeenCalled();
  });
});

describe("idempotency and tier", () => {
  it("keys the grant on the Dodo payment id", async () => {
    await (await handler())(payment({ payment_id: "pay_abc" }));

    expect(grantMock.mock.calls[0][0].paymentRef).toBe("pay_abc");
  });

  it("upgrades the user to pro when a Pro pack is granted", async () => {
    await (await handler())(payment({ product_cart: [{ product_id: "prod_pro", quantity: 1 }] }));

    expect(updateSet).toHaveBeenCalledWith({ tier: "pro" });
  });

  it("does not upgrade tier for a Basic pack", async () => {
    await (await handler())(payment());

    expect(updateSet).not.toHaveBeenCalled();
  });

  it("does not re-upgrade tier when a redelivered webhook grants nothing", async () => {
    grantMock.mockResolvedValue(false);

    await (await handler())(payment({ product_cart: [{ product_id: "prod_pro", quantity: 1 }] }));

    expect(updateSet).not.toHaveBeenCalled();
  });

  it("upgrades tier when a mixed cart contains any Pro pack", async () => {
    await (await handler())(
      payment({
        product_cart: [
          { product_id: "prod_basic", quantity: 1 },
          { product_id: "prod_pro", quantity: 1 },
        ],
      })
    );

    expect(updateSet).toHaveBeenCalledWith({ tier: "pro" });
  });
});
