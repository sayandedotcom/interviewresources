import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { COOKIE_CONSENT_STORAGE_KEY } from "@/hooks/use-cookie-consent";

import { CookieConsentBanner } from "./cookie-consent";

describe("CookieConsentBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the dialog when no consent is stored", async () => {
    render(<CookieConsentBanner />);
    expect(await screen.findByText(/we value your privacy/i)).toBeInTheDocument();
  });

  it("does not show the dialog when consent was already accepted", () => {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "accepted");
    render(<CookieConsentBanner />);
    expect(screen.queryByText(/we value your privacy/i)).not.toBeInTheDocument();
  });

  it("hides the dialog and stores 'accepted' when Accept is clicked", async () => {
    const user = userEvent.setup();
    render(<CookieConsentBanner />);

    await user.click(await screen.findByRole("button", { name: "Accept" }));

    expect(screen.queryByText(/we value your privacy/i)).not.toBeInTheDocument();
    expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe("accepted");
  });

  it("hides the dialog and stores 'rejected' when Reject is clicked", async () => {
    const user = userEvent.setup();
    render(<CookieConsentBanner />);

    await user.click(await screen.findByRole("button", { name: "Reject" }));

    expect(screen.queryByText(/we value your privacy/i)).not.toBeInTheDocument();
    expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe("rejected");
  });

  it("links to the cookie policy page", async () => {
    render(<CookieConsentBanner />);
    const link = await screen.findByRole("link", { name: /cookie policy/i });
    expect(link).toHaveAttribute("href", "/cookies");
  });
});
