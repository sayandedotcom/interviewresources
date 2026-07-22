import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LogoMark } from "./logo";

describe("LogoMark", () => {
  it("renders the radar-scope svg on a solid blue tile by default", () => {
    const { container } = render(<LogoMark />);
    const tile = container.firstElementChild;
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(tile).toHaveClass("bg-primary", "text-white");
  });

  it("inverts to a white tile with a blue mark", () => {
    const { container } = render(<LogoMark variant="inverted" />);
    expect(container.firstElementChild).toHaveClass("bg-white", "text-primary");
  });

  it("draws every mark element in a single currentColor", () => {
    const { container } = render(<LogoMark />);
    expect(container.querySelector("circle.fill-tertiary")).not.toBeInTheDocument();
    for (const el of container.querySelectorAll("svg circle, svg line")) {
      const painted = el.getAttribute("stroke") ?? el.getAttribute("fill");
      expect(painted).toBe("currentColor");
    }
  });

  it("renders no glow span unless glowClassName is provided", () => {
    const { container } = render(<LogoMark />);
    expect(container.querySelectorAll("span span")).toHaveLength(0);
  });

  it("renders the glow span when glowClassName is provided", () => {
    const { container } = render(<LogoMark glowClassName="bg-primary/30" />);
    const glow = container.querySelector("span span");
    expect(glow).toHaveClass("bg-primary/30");
  });
});
