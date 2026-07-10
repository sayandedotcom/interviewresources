import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SidebarProvider } from "@/components/ui/sidebar";

import type { SessionUser } from "@/lib/session";

import { NavUser } from "./nav-user";

/**
 * The profile row used to render nothing at all until `/api/me` came back — two
 * database roundtrips deep — which is why it took so long to appear. It must now
 * paint from whatever the server already knows, and treat the balance as an
 * extra that arrives late.
 */

const signIn = vi.fn();
const useSessionMock = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  useSession: () => useSessionMock(),
  signInWithGoogle: (...args: unknown[]) => signIn(...args),
  signOut: vi.fn(),
}));

const ada: SessionUser = { id: "u1", name: "Ada Lovelace", email: "ada@example.com", image: null };

/** Resolves `/api/me` only when `release()` is called, so the pending state is observable. */
function deferredMe(balance = 420) {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      await gate;
      return { json: async () => ({ signedIn: true, balance }) };
    })
  );
  return release;
}

function renderNav(initialUser: SessionUser | null) {
  return render(
    <SidebarProvider>
      <NavUser initialUser={initialUser} />
    </SidebarProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useSessionMock.mockReturnValue({ data: { user: ada }, isPending: false });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ json: async () => ({ signedIn: true, balance: 420 }) }))
  );
});

describe("first paint", () => {
  it("shows the server's user while useSession is still pending", () => {
    useSessionMock.mockReturnValue({ data: null, isPending: true });
    renderNav(ada);

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });

  it("does not wait on /api/me to render the row", () => {
    deferredMe();
    useSessionMock.mockReturnValue({ data: null, isPending: true });
    renderNav(ada);

    // The balance request is still in flight, and the row is already there.
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("offers sign-in immediately when the server says nobody is signed in", () => {
    useSessionMock.mockReturnValue({ data: null, isPending: true });
    renderNav(null);

    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
  });

  it("asks for the balance once, for the signed-in user", async () => {
    renderNav(ada);

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/me"));
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("never asks for a balance nobody can see", () => {
    useSessionMock.mockReturnValue({ data: null, isPending: false });
    renderNav(null);

    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("useSession overrides the server", () => {
  it("drops the row when the client learns the user signed out", () => {
    useSessionMock.mockReturnValue({ data: null, isPending: false });
    renderNav(ada);

    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("prefers the client's user once it has one", () => {
    useSessionMock.mockReturnValue({
      data: { user: { ...ada, name: "Grace Hopper" } },
      isPending: false,
    });
    renderNav(ada);

    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
  });
});

describe("balance", () => {
  it("labels the menu item before the balance lands, then fills it in", async () => {
    const user = userEvent.setup();
    const release = deferredMe(420);
    renderNav(ada);

    await user.click(screen.getByRole("button", { name: /ada lovelace/i }));
    expect(await screen.findByText("Credits · buy more")).toBeInTheDocument();

    release();
    expect(await screen.findByText("420 credits · buy more")).toBeInTheDocument();
  });

  it("survives a failing /api/me rather than blanking the row", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("offline")))
    );
    renderNav(ada);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });
});
