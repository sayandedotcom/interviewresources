import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { COOKIE_CONSENT_STORAGE_KEY } from "@/hooks/use-cookie-consent";

import { Analytics } from "./analytics";

vi.mock("@next/third-parties/google", () => ({
  GoogleAnalytics: ({ gaId }: { gaId: string }) => (
    <div data-testid="google-analytics" data-ga-id={gaId} />
  ),
}));

vi.mock("@vercel/analytics/react", () => ({
  Analytics: () => <div data-testid="vercel-analytics" />,
}));

describe("Analytics", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("does not render analytics scripts when consent is undecided", () => {
    render(<Analytics />);
    expect(screen.queryByTestId("google-analytics")).not.toBeInTheDocument();
    expect(screen.queryByTestId("vercel-analytics")).not.toBeInTheDocument();
  });

  it("does not render analytics scripts when consent was rejected", () => {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "rejected");
    render(<Analytics />);
    expect(screen.queryByTestId("google-analytics")).not.toBeInTheDocument();
    expect(screen.queryByTestId("vercel-analytics")).not.toBeInTheDocument();
  });

  it("renders analytics scripts once consent is accepted", async () => {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "accepted");
    render(<Analytics />);
    expect(await screen.findByTestId("vercel-analytics")).toBeInTheDocument();
  });
});
