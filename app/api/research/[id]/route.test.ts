import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/session";

vi.mock("@/lib/session");
vi.mock("@/lib/research/sessions", () => ({ deleteSession: vi.fn() }));

const { getSessionUser } = await import("@/lib/session");
const { deleteSession } = await import("@/lib/research/sessions");
const { DELETE } = await import("./route");

const sessionMock = vi.mocked(getSessionUser);
const deleteMock = vi.mocked(deleteSession);

const user: SessionUser = { id: "user-1", email: "ada@example.com", name: "Ada", image: null };

const ctx = { params: Promise.resolve({ id: "research-1" }) };
const req = () => new Request("https://test.local/api/research/research-1", { method: "DELETE" });

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.mockResolvedValue(user);
  deleteMock.mockResolvedValue(true);
});

describe("authorization", () => {
  it("rejects an anonymous caller before deleting anything", async () => {
    sessionMock.mockResolvedValue(null);

    expect((await DELETE(req(), ctx)).status).toBe(401);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("scopes the delete to the caller, so one user cannot erase another's run", async () => {
    await DELETE(req(), ctx);

    expect(deleteMock).toHaveBeenCalledWith(user.id, "research-1");
  });

  it("reports a run owned by somebody else as missing, leaking no existence", async () => {
    deleteMock.mockResolvedValue(false);

    const res = await DELETE(req(), ctx);

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "not_found" });
  });
});

describe("deletion", () => {
  it("confirms a successful delete", async () => {
    const res = await DELETE(req(), ctx);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ deleted: true });
  });
});
