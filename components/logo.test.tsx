import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LogoMark } from "./logo";

describe("LogoMark", () => {
  it("renders the radar-scope svg with a tertiary dot blip", () => {
    const { container } = render(<LogoMark />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(container.querySelector("circle.fill-tertiary")).toBeInTheDocument();
  });

  it("renders no glow span unless glowClassName is provided", () => {
    const { container } = render(<LogoMark />);
    expect(container.querySelectorAll("span span")).toHaveLength(0);
  });

  it("renders the glow span when glowClassName is provided", () => {
    const { container } = render(<LogoMark glowClassName="bg-tertiary/30" />);
    const glow = container.querySelector("span span");
    expect(glow).toHaveClass("bg-tertiary/30");
  });
});
