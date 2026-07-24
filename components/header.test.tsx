import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Header } from "@/components/header";

const useSessionMock = vi.fn();
const signOutMock = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  useSession: () => useSessionMock(),
  signOut: () => signOutMock(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ json: async () => ({ signedIn: true, balance: 420 }) }))
  );
});

describe("header auth fallback", () => {
  it("shows the signed-out CTA while the session request is pending", () => {
    useSessionMock.mockReturnValue({ data: null, isPending: true });
    render(<Header />);

    expect(screen.getAllByRole("link", { name: /try it for \$1/i }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/open app/i)).not.toBeInTheDocument();
  });

  it("replaces the fallback with signed-in actions after the session resolves", async () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "u1", name: "Ada", email: "ada@example.com", image: null } },
      isPending: false,
    });
    render(<Header />);

    expect(await screen.findByRole("link", { name: /open app/i })).toBeInTheDocument();
    expect(screen.getAllByText(/sign out/i).length).toBeGreaterThan(0);
  });
});

describe("mobile navigation", () => {
  it("opens a compact menu with section anchors", async () => {
    const user = userEvent.setup();
    useSessionMock.mockReturnValue({ data: null, isPending: true });
    render(<Header />);

    await user.click(screen.getByRole("button", { name: /open navigation menu/i }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("link", { name: "How it works" })).toHaveAttribute(
      "href",
      "/#how-it-works"
    );
    expect(within(dialog).getByRole("link", { name: "Trust" })).toHaveAttribute("href", "/#trust");
  });
});
