import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { COOKIE_CONSENT_STORAGE_KEY } from "@/hooks/use-cookie-consent";

import { CookiePreferencesLink } from "./cookie-preferences-link";

describe("CookiePreferencesLink", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders a button labeled Cookie Preferences", () => {
    render(<CookiePreferencesLink />);
    expect(screen.getByRole("button", { name: "Cookie Preferences" })).toBeInTheDocument();
  });

  it("clears stored consent when clicked", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "accepted");
    render(<CookiePreferencesLink />);

    await user.click(screen.getByRole("button", { name: "Cookie Preferences" }));

    expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBeNull();
  });
});
