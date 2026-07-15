import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SidebarProvider } from "@/components/ui/sidebar";

import type { SessionUser } from "@/lib/session";

import { NavUser } from "./nav-user";

/**
 * The profile row used to render nothing at all until `/api/me` came back — two
 * database roundtrips deep — which is why it took so long to appear. It now
 * paints entirely from what the server already resolved: the user and the
 * balance both arrive as props, so there is no client fetch at all.
 */

const signIn = vi.fn();
const useSessionMock = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  useSession: () => useSessionMock(),
  signInWithGoogle: (...args: unknown[]) => signIn(...args),
  signOut: vi.fn(),
}));

const ada: SessionUser = { id: "u1", name: "Ada Lovelace", email: "ada@example.com", image: null };

function renderNav(initialUser: SessionUser | null, initialBalance = 420) {
  return render(
    <SidebarProvider>
      <NavUser initialUser={initialUser} initialBalance={initialBalance} />
    </SidebarProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useSessionMock.mockReturnValue({ data: { user: ada }, isPending: false });
  // The row must never touch the network; a stub here turns any stray fetch
  // into a visible failure rather than a silent pass.
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("NavUser should not fetch");
    })
  );
});

describe("first paint", () => {
  it("shows the server's user while useSession is still pending", () => {
    useSessionMock.mockReturnValue({ data: null, isPending: true });
    renderNav(ada);

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });

  it("renders the row from props without any fetch", () => {
    useSessionMock.mockReturnValue({ data: null, isPending: true });
    renderNav(ada);

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("offers sign-in immediately when the server says nobody is signed in", () => {
    useSessionMock.mockReturnValue({ data: null, isPending: true });
    renderNav(null);

    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
  });
});

describe("useSession overrides the server", () => {
  it("drops the row when the client learns the user signed out", () => {
    useSessionMock.mockReturnValue({ data: null, isPending: false });
    renderNav(ada);

    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
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
  it("shows the server's balance in the menu on first open", async () => {
    const user = userEvent.setup();
    renderNav(ada, 420);

    await user.click(screen.getByRole("button", { name: /ada lovelace/i }));
    expect(await screen.findByText("420 credits · buy more")).toBeInTheDocument();
  });

  it("shows a zero balance as a real number, not a placeholder", async () => {
    const user = userEvent.setup();
    renderNav(ada, 0);

    await user.click(screen.getByRole("button", { name: /ada lovelace/i }));
    expect(await screen.findByText("0 credits · buy more")).toBeInTheDocument();
  });
});
