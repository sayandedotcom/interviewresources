import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AboutSection } from "./about-section";

describe("AboutSection", () => {
  it("states the app identity, purpose, Google data use, and privacy policy", () => {
    render(<AboutSection />);

    expect(
      screen.getByRole("heading", { name: "What is Interview Resources?" })
    ).toBeInTheDocument();
    expect(screen.getByText(/helps candidates prepare for job interviews/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /google sign-in and your data/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/name, email address, and profile picture/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /interview resources privacy policy/i })
    ).toHaveAttribute("href", "/privacy-policy");
  });
});
