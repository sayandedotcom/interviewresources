import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SidebarProvider } from "@/components/ui/sidebar";

import { AppSidebar } from "./app-sidebar";

/**
 * The sidebar is the only place a user can destroy a report, and the only place
 * the session quota is ever shown. Both paths are exercised here against a
 * stubbed `/api/researches`.
 */

const push = vi.fn();
const pathname = vi.fn(() => "/prepare");

vi.mock("next/navigation", () => ({
  usePathname: () => pathname(),
  useRouter: () => ({ push }),
}));

const ada = { id: "u1", name: "Ada", email: "ada@example.com", image: null };

const useSessionMock = vi.fn(() => ({ data: { user: ada }, isPending: false }));
vi.mock("@/lib/auth-client", () => ({
  useSession: () => useSessionMock(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
}));

// NavUser fetches /api/me and renders a dropdown of its own; it is not the
// subject here.
vi.mock("@/components/nav-user", () => ({ NavUser: () => null }));

function session(id: string, companyName: string) {
  return { id, companyName, interviewType: "dsa", status: "done", createdAt: "2026-01-01" };
}

/** Only the two fields the sidebar reads off a response. */
type StubResponse = { ok: boolean; json: () => Promise<Record<string, unknown>> };

/** Serves `/api/researches`, and records every other call for assertions. */
function stubFetch(sessions: ReturnType<typeof session>[], limit = 10) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit): Promise<StubResponse> => {
    if (url === "/api/researches") {
      return { ok: true, json: async () => ({ sessions, limit }) };
    }
    if (url.endsWith("/share")) {
      return { ok: true, json: async () => ({ token: "tok_abc" }) };
    }
    if (init?.method === "DELETE") {
      return { ok: true, json: async () => ({ deleted: true }) };
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderSidebar(initialUser: typeof ada | null = ada) {
  return render(
    <SidebarProvider>
      <AppSidebar initialUser={initialUser} />
    </SidebarProvider>
  );
}

/** Opens the three-dot menu on the row for `companyName`. */
async function openRowMenu(user: ReturnType<typeof userEvent.setup>, companyName: string) {
  await user.click(await screen.findByRole("button", { name: `Actions for ${companyName}` }));
  await screen.findByRole("menu");
}

/** The sidebar's own header, as distinct from the rail that also toggles it. */
function header(): HTMLElement {
  return document.querySelector<HTMLElement>('[data-slot="sidebar-header"]')!;
}

beforeEach(() => {
  vi.clearAllMocks();
  pathname.mockReturnValue("/prepare");
  useSessionMock.mockReturnValue({ data: { user: ada }, isPending: false });
});

/**
 * `userEvent.setup()` installs a clipboard stub of its own, so this has to run
 * after it or the spy is quietly replaced.
 */
function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  return writeText;
}

describe("header", () => {
  it("shows the brand and a sidebar trigger beside it", async () => {
    stubFetch([]);
    renderSidebar();

    // Both live in the header, above the new-session button.
    expect(within(header()).getByText("Scouting Report")).toBeInTheDocument();
    expect(within(header()).getByRole("button", { name: /toggle sidebar/i })).toBeInTheDocument();
  });

  it("links the brand home and the new-session button to the prepare page", () => {
    stubFetch([]);
    renderSidebar();

    expect(screen.getByRole("link", { name: /scouting report/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /new session/i })).toHaveAttribute("href", "/prepare");
  });
});

describe("session quota", () => {
  it("shows how many of the allowed sessions are used", async () => {
    stubFetch([session("r1", "Stripe")]);
    renderSidebar();

    expect(await screen.findByText("1/10")).toBeInTheDocument();
  });

  it("warns that the oldest goes when the user is at the limit", async () => {
    stubFetch(Array.from({ length: 10 }, (_, i) => session(`r${i}`, `Co${i}`)));
    renderSidebar();

    expect(await screen.findByText(/10-session limit/)).toBeInTheDocument();
    expect(screen.getByText(/deletes your oldest/)).toBeInTheDocument();
  });

  it("says nothing about eviction below the limit", async () => {
    stubFetch([session("r1", "Stripe")]);
    renderSidebar();

    await screen.findByText("1/10");
    expect(screen.queryByText(/deletes your oldest/)).not.toBeInTheDocument();
  });

  it("hides the counter from a signed-out visitor", () => {
    useSessionMock.mockReturnValue({ data: null as never, isPending: false });
    stubFetch([]);
    renderSidebar(null);

    expect(screen.queryByText(/\/10$/)).not.toBeInTheDocument();
    expect(screen.getByText("Sign in to save sessions")).toBeInTheDocument();
  });
});

describe("first paint", () => {
  it("lists sessions from the server's user, without waiting on useSession", async () => {
    // What a real first load looks like: the client's session request is still
    // in flight, but the server already resolved who this is.
    useSessionMock.mockReturnValue({ data: null as never, isPending: true });
    stubFetch([session("r1", "Stripe")]);
    renderSidebar();

    expect(await screen.findByText("Stripe")).toBeInTheDocument();
    expect(screen.queryByText("Sign in to save sessions")).not.toBeInTheDocument();
  });

  it("shows a signed-out visitor the sign-in copy immediately, not a skeleton", () => {
    useSessionMock.mockReturnValue({ data: null as never, isPending: true });
    stubFetch([]);
    renderSidebar(null);

    expect(screen.getByText("Sign in to save sessions")).toBeInTheDocument();
  });

  it("empties the list once useSession reports the user signed out", async () => {
    const fetchMock = stubFetch([session("r1", "Stripe")]);
    useSessionMock.mockReturnValue({ data: null as never, isPending: false });
    renderSidebar(ada);

    expect(screen.getByText("Sign in to save sessions")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith("/api/researches");
  });
});

describe("row actions", () => {
  it("offers exactly share and delete", async () => {
    const user = userEvent.setup();
    stubFetch([session("r1", "Stripe")]);
    renderSidebar();

    await openRowMenu(user, "Stripe");

    const menu = screen.getByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: "Share" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
    expect(within(menu).getAllByRole("menuitem")).toHaveLength(2);
  });

  it("gives every row its own menu", async () => {
    stubFetch([session("r1", "Stripe"), session("r2", "Vercel")]);
    renderSidebar();

    expect(await screen.findByRole("button", { name: "Actions for Stripe" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Actions for Vercel" })).toBeInTheDocument();
  });
});

describe("share", () => {
  it("copies a link built from the minted token", async () => {
    const user = userEvent.setup();
    const writeText = stubClipboard();
    const fetchMock = stubFetch([session("r1", "Stripe")]);
    renderSidebar();

    await openRowMenu(user, "Stripe");
    await user.click(screen.getByRole("menuitem", { name: "Share" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/research/r1/share", { method: "POST" });
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/share/tok_abc`)
    );
    expect(await screen.findByText("Share link copied")).toBeInTheDocument();
  });

  it("says so when the link cannot be made, rather than failing silently", async () => {
    const user = userEvent.setup();
    const writeText = stubClipboard();
    const fetchMock = stubFetch([session("r1", "Stripe")]);
    fetchMock.mockImplementation(async (url: string) =>
      url === "/api/researches"
        ? { ok: true, json: async () => ({ sessions: [session("r1", "Stripe")], limit: 10 }) }
        : { ok: false, json: async () => ({ error: "not_found" }) }
    );
    renderSidebar();

    await openRowMenu(user, "Stripe");
    await user.click(screen.getByRole("menuitem", { name: "Share" }));

    expect(await screen.findByText("Could not create a share link")).toBeInTheDocument();
    expect(writeText).not.toHaveBeenCalled();
  });
});

describe("delete", () => {
  it("confirms first, then deletes and drops the row", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch([session("r1", "Stripe"), session("r2", "Vercel")]);
    renderSidebar();

    await openRowMenu(user, "Stripe");
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(screen.getByRole("dialog", { name: /delete this session/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/research/r1", { method: "DELETE" });
    await waitFor(() => expect(screen.queryByText("Stripe")).not.toBeInTheDocument());
    expect(screen.getByText("Vercel")).toBeInTheDocument();
  });

  it("deletes nothing when the confirmation is dismissed", async () => {
    const user = userEvent.setup();
    stubFetch([session("r1", "Stripe")]);
    renderSidebar();

    await openRowMenu(user, "Stripe");
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(screen.getByRole("dialog", { name: /delete this session/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Stripe")).toBeInTheDocument();
  });

  it("navigates away when the open session is the one deleted", async () => {
    const user = userEvent.setup();
    pathname.mockReturnValue("/prepare/r1");
    stubFetch([session("r1", "Stripe")]);
    renderSidebar();

    await openRowMenu(user, "Stripe");
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/prepare"));
  });

  it("stays put when a different session is deleted", async () => {
    const user = userEvent.setup();
    pathname.mockReturnValue("/prepare/r2");
    stubFetch([session("r1", "Stripe"), session("r2", "Vercel")]);
    renderSidebar();

    await openRowMenu(user, "Stripe");
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByText("Stripe")).not.toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
  });

  it("keeps the row when the delete fails", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch([session("r1", "Stripe")]);
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
      init?.method === "DELETE"
        ? { ok: false, json: async () => ({ error: "not_found" }) }
        : { ok: true, json: async () => ({ sessions: [session("r1", "Stripe")], limit: 10 }) }
    );
    renderSidebar();

    await openRowMenu(user, "Stripe");
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("Could not delete that session")).toBeInTheDocument();
    expect(screen.getByText("Stripe")).toBeInTheDocument();
  });
});
