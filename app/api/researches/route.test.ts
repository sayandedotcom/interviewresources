import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/session";

vi.mock("@/lib/session");

const limit = vi.fn();
const orderBy = vi.fn(() => ({ limit }));
const where = vi.fn(() => ({ orderBy }));
const from = vi.fn(() => ({ where }));
vi.mock("@/lib/db/index", () => ({ db: { select: vi.fn(() => ({ from })) } }));

const { getSessionUser } = await import("@/lib/session");
const { db } = await import("@/lib/db/index");
const { MAX_SESSIONS_PER_USER } = await import("@/lib/research/sessions");
const { GET } = await import("./route");

const sessionMock = vi.mocked(getSessionUser);
const selectMock = vi.mocked(db.select);

const user: SessionUser = {
  id: "user-1",
  email: "ada@example.com",
  name: "Ada",
  image: null,
};

const req = () => new Request("https://test.local/api/researches");

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.mockResolvedValue(user);
  limit.mockResolvedValue([{ id: "r1", companyName: "Stripe", status: "done" }]);
});

describe("authorization", () => {
  it("returns an empty list for an anonymous caller without querying", async () => {
    sessionMock.mockResolvedValue(null);

    const res = await GET(req());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ sessions: [], limit: MAX_SESSIONS_PER_USER });
    expect(selectMock).not.toHaveBeenCalled();
  });

  it("scopes the query to the signed-in user", async () => {
    await GET(req());

    // The `where` clause is the only thing standing between this list and every
    // other user's research history.
    expect(where).toHaveBeenCalledOnce();
    expect(selectMock).toHaveBeenCalledOnce();
  });
});

describe("listing", () => {
  it("returns the user's runs", async () => {
    await expect((await GET(req())).json()).resolves.toEqual({
      sessions: [{ id: "r1", companyName: "Stripe", status: "done" }],
      limit: MAX_SESSIONS_PER_USER,
    });
  });

  it("returns an empty list for a user with no runs", async () => {
    limit.mockResolvedValue([]);

    await expect((await GET(req())).json()).resolves.toEqual({
      sessions: [],
      limit: MAX_SESSIONS_PER_USER,
    });
  });

  it("orders newest first and asks for no more rows than a user can keep", async () => {
    await GET(req());

    expect(orderBy).toHaveBeenCalledOnce();
    expect(limit).toHaveBeenCalledWith(MAX_SESSIONS_PER_USER);
  });

  it("tells the sidebar the quota, so it can render N/limit", async () => {
    const body = await (await GET(req())).json();

    expect(body.limit).toBe(MAX_SESSIONS_PER_USER);
  });

  it("selects no cost columns — the sidebar has no business seeing them", async () => {
    await GET(req());

    const columns = Object.keys(selectMock.mock.calls[0][0] as object);
    expect(columns).toEqual(["id", "companyName", "interviewType", "status", "createdAt"]);
  });
});
