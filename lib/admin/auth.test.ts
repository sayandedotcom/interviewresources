import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/session";

vi.mock("@/env", () => ({ env: { ADMIN_EMAILS: undefined } }));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));

const { env } = await import("@/env");
const { isAdmin } = await import("./auth");

function user(email: string): SessionUser {
  return { id: "user-1", email, name: "Ada", image: null };
}

beforeEach(() => {
  (env as { ADMIN_EMAILS?: string }).ADMIN_EMAILS = undefined;
});

describe("isAdmin", () => {
  it("denies everyone when ADMIN_EMAILS is unset — fails closed", () => {
    expect(isAdmin(user("ada@example.com"))).toBe(false);
  });

  it("denies everyone when ADMIN_EMAILS is an empty string", () => {
    (env as { ADMIN_EMAILS?: string }).ADMIN_EMAILS = "";
    expect(isAdmin(user("ada@example.com"))).toBe(false);
  });

  it("denies a signed-out user even when the list is populated", () => {
    (env as { ADMIN_EMAILS?: string }).ADMIN_EMAILS = "ada@example.com";
    expect(isAdmin(null)).toBe(false);
  });

  it("allows an exact match", () => {
    (env as { ADMIN_EMAILS?: string }).ADMIN_EMAILS = "ada@example.com,bob@example.com";
    expect(isAdmin(user("ada@example.com"))).toBe(true);
  });

  it("is case-insensitive", () => {
    (env as { ADMIN_EMAILS?: string }).ADMIN_EMAILS = "ada@example.com";
    expect(isAdmin(user("ADA@EXAMPLE.COM"))).toBe(true);
  });

  it("tolerates whitespace around entries", () => {
    (env as { ADMIN_EMAILS?: string }).ADMIN_EMAILS = " ada@example.com , bob@example.com ";
    expect(isAdmin(user("bob@example.com"))).toBe(true);
  });

  it("denies an email not in the list", () => {
    (env as { ADMIN_EMAILS?: string }).ADMIN_EMAILS = "ada@example.com";
    expect(isAdmin(user("eve@example.com"))).toBe(false);
  });
});
