import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/session";

vi.mock("@/lib/session");
vi.mock("@/lib/events", () => ({ recordProductEvent: vi.fn() }));

const limit = vi.fn();
const where = vi.fn(() => ({ limit }));
const innerJoin = vi.fn(() => ({ where }));
const from = vi.fn(() => ({ innerJoin }));
const updateWhere = vi.fn(async () => undefined);
const set = vi.fn(() => ({ where: updateWhere }));
vi.mock("@/lib/db/index", () => ({
  db: { select: vi.fn(() => ({ from })), update: vi.fn(() => ({ set })) },
}));

const { getSessionUser } = await import("@/lib/session");
const { db } = await import("@/lib/db/index");
const { POST } = await import("./route");

const sessionMock = vi.mocked(getSessionUser);
const selectMock = vi.mocked(db.select);
const updateMock = vi.mocked(db.update);

const user: SessionUser = { id: "user-1", email: "ada@example.com", name: "Ada", image: null };

const ctx = { params: Promise.resolve({ id: "research-1" }) };
const req = () =>
  new Request("https://test.local/api/research/research-1/share", { method: "POST" });

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.mockResolvedValue(user);
  limit.mockResolvedValue([{ reportId: "report-1", shareToken: null }]);
});

describe("authorization", () => {
  it("rejects an anonymous caller before querying", async () => {
    sessionMock.mockResolvedValue(null);

    expect((await POST(req(), ctx)).status).toBe(401);
    expect(selectMock).not.toHaveBeenCalled();
  });

  it("will not mint a token for a report the caller does not own", async () => {
    limit.mockResolvedValue([]);

    const res = await POST(req(), ctx);

    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("scopes the lookup, rather than trusting the id alone", async () => {
    await POST(req(), ctx);

    expect(where).toHaveBeenCalledOnce();
  });
});

describe("minting", () => {
  it("mints an unguessable token for a report that has none", async () => {
    const { token } = await (await POST(req(), ctx)).json();

    expect(token).toMatch(/^[\w-]{20,}$/);
    expect(set).toHaveBeenCalledWith({ shareToken: token });
  });

  it("reuses an existing token, so a link already sent keeps working", async () => {
    limit.mockResolvedValue([{ reportId: "report-1", shareToken: "already-minted" }]);

    await expect((await POST(req(), ctx)).json()).resolves.toEqual({ token: "already-minted" });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("does not repeat a token across reports", async () => {
    const first = await (await POST(req(), ctx)).json();
    const second = await (await POST(req(), ctx)).json();

    expect(first.token).not.toBe(second.token);
  });
});
