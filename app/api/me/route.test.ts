import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/session";

vi.mock("@/lib/session");
vi.mock("@/lib/credits", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/credits")>();
  return { ...actual, getBalance: vi.fn(), isPaymentCredited: vi.fn() };
});

const { getSessionUser } = await import("@/lib/session");
const { getBalance, isPaymentCredited } = await import("@/lib/credits");
const { GET } = await import("./route");

const sessionMock = vi.mocked(getSessionUser);
const balanceMock = vi.mocked(getBalance);
const creditedMock = vi.mocked(isPaymentCredited);

const user: SessionUser = {
  id: "user-1",
  email: "ada@example.com",
  name: "Ada",
  image: "https://img/a.png",
};

const req = () => new Request("https://test.local/api/me");

/** Credit ceiling per effort: usdToCredits of each preset's capUsd. */
const EXPECTED_EFFORT_CREDITS = { low: 65, medium: 130, high: 260 };
/** Extension ceilings: half of each full-run cap, so half the credits. */
const EXPECTED_EXTEND_CREDITS = { low: 33, medium: 65, high: 130 };

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.mockResolvedValue(user);
  balanceMock.mockResolvedValue(454);
  creditedMock.mockResolvedValue(false);
});

describe("anonymous", () => {
  it("reports signed-out with a zero balance instead of a 401", async () => {
    sessionMock.mockResolvedValue(null);

    await expect((await GET(req())).json()).resolves.toEqual({
      signedIn: false,
      user: null,
      balance: 0,
      maxRunCredits: 260,
      minRunCredits: 50,
      effortCredits: EXPECTED_EFFORT_CREDITS,
      extendCredits: EXPECTED_EXTEND_CREDITS,
    });
  });

  it("does not query the ledger for an anonymous caller", async () => {
    sessionMock.mockResolvedValue(null);

    await GET(req());

    expect(balanceMock).not.toHaveBeenCalled();
  });

  it("still exposes the run thresholds so the marketing UI can render them", async () => {
    sessionMock.mockResolvedValue(null);

    const body = await (await GET(req())).json();
    expect(body.minRunCredits).toBe(50);
    expect(body.maxRunCredits).toBe(260);
  });

  it("prices every effort level so the form can label its choices", async () => {
    sessionMock.mockResolvedValue(null);

    const body = await (await GET(req())).json();
    expect(body.effortCredits).toEqual(EXPECTED_EFFORT_CREDITS);
    // High effort must never promise more than the advertised run ceiling.
    expect(body.effortCredits.high).toBe(body.maxRunCredits);
  });

  it("prices every extension effort at half the matching full-run ceiling", async () => {
    sessionMock.mockResolvedValue(null);

    const body = await (await GET(req())).json();
    expect(body.extendCredits).toEqual(EXPECTED_EXTEND_CREDITS);
  });
});

describe("signed in", () => {
  it("returns the profile and live balance", async () => {
    await expect((await GET(req())).json()).resolves.toEqual({
      signedIn: true,
      user: { name: "Ada", email: "ada@example.com", image: "https://img/a.png" },
      balance: 454,
      maxRunCredits: 260,
      minRunCredits: 50,
      effortCredits: EXPECTED_EFFORT_CREDITS,
      extendCredits: EXPECTED_EXTEND_CREDITS,
    });
  });

  it("never leaks the internal user id to the client", async () => {
    const body = await (await GET(req())).json();

    expect(body.user).not.toHaveProperty("id");
  });

  it("passes the session user id through to the balance lookup", async () => {
    await GET(req());

    expect(balanceMock).toHaveBeenCalledWith("user-1");
  });

  it("reports a negative balance honestly rather than clamping it to zero", async () => {
    balanceMock.mockResolvedValue(-4);

    const body = await (await GET(req())).json();
    expect(body.balance).toBe(-4);
  });
});

/**
 * The success page asks whether one specific payment has landed. It cannot use
 * the balance for this: a returning customer already has credits before their
 * new purchase settles.
 */
describe("payment settlement lookup", () => {
  const withPayment = (id: string) => new Request(`https://test.local/api/me?payment_id=${id}`);

  it("answers whether that payment reached the ledger", async () => {
    creditedMock.mockResolvedValue(true);

    const body = await (await GET(withPayment("pay_abc"))).json();
    expect(body.credited).toBe(true);
  });

  it("says so when the webhook has not landed yet, even with credits on the account", async () => {
    balanceMock.mockResolvedValue(420);
    creditedMock.mockResolvedValue(false);

    const body = await (await GET(withPayment("pay_abc"))).json();
    expect(body.credited).toBe(false);
    expect(body.balance).toBe(420);
  });

  it("scopes the lookup to the session user, not just the ref", async () => {
    // The payment id arrives in a client-controlled return URL. Without the user
    // scope this would let one account probe another's payments.
    await GET(withPayment("pay_abc"));

    expect(creditedMock).toHaveBeenCalledWith("user-1", "pay_abc");
  });

  it("omits the field entirely when no payment is named", async () => {
    const body = await (await GET(req())).json();

    expect(body).not.toHaveProperty("credited");
  });

  it("does not query the ledger for the header and form, which poll without a payment", async () => {
    await GET(req());

    expect(creditedMock).not.toHaveBeenCalled();
  });

  it("never looks up a payment for an anonymous caller", async () => {
    sessionMock.mockResolvedValue(null);

    const body = await (await GET(withPayment("pay_abc"))).json();

    expect(creditedMock).not.toHaveBeenCalled();
    expect(body).not.toHaveProperty("credited");
  });
});
