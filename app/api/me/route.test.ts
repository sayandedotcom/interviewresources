import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/session";

vi.mock("@/lib/session");
vi.mock("@/lib/credits", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/credits")>();
  return { ...actual, getBalance: vi.fn() };
});

const { getSessionUser } = await import("@/lib/session");
const { getBalance } = await import("@/lib/credits");
const { GET } = await import("./route");

const sessionMock = vi.mocked(getSessionUser);
const balanceMock = vi.mocked(getBalance);

const user: SessionUser = {
  id: "user-1",
  email: "ada@example.com",
  name: "Ada",
  image: "https://img/a.png",
  tier: "pro",
};

const req = () => new Request("https://test.local/api/me");

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.mockResolvedValue(user);
  balanceMock.mockResolvedValue(454);
});

describe("anonymous", () => {
  it("reports signed-out with a zero balance instead of a 401", async () => {
    sessionMock.mockResolvedValue(null);

    await expect((await GET(req())).json()).resolves.toEqual({
      signedIn: false,
      user: null,
      balance: 0,
      maxRunCredits: 130,
      minRunCredits: 50,
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
    expect(body.maxRunCredits).toBe(130);
  });
});

describe("signed in", () => {
  it("returns the profile and live balance", async () => {
    await expect((await GET(req())).json()).resolves.toEqual({
      signedIn: true,
      user: { name: "Ada", email: "ada@example.com", image: "https://img/a.png", tier: "pro" },
      balance: 454,
      maxRunCredits: 130,
      minRunCredits: 50,
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
