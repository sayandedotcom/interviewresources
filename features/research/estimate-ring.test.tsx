import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EstimateRing, overBudget } from "./estimate-ring";

/** The gauge arc's colour is the whole signal, and it only lives in inline style. */
function arcColor(container: HTMLElement): string {
  const circles = container.querySelectorAll("circle");
  // The primary (value) arc is the last one drawn.
  return circles[circles.length - 1].getAttribute("style") ?? "";
}

describe("EstimateRing", () => {
  it("reads green while the run is a small bite of the balance", () => {
    const { container } = render(<EstimateRing value={20} max={200} />);
    expect(arcColor(container)).toContain("--status-good");
  });

  it("turns amber as the run approaches the balance", () => {
    const { container } = render(<EstimateRing value={140} max={200} />);
    expect(arcColor(container)).toContain("--status-warning");
  });

  it("turns red once the run is about to exhaust the balance", () => {
    const { container } = render(<EstimateRing value={190} max={200} />);
    expect(arcColor(container)).toContain("--status-critical");
  });

  it("stays red, and does not overfill, when the estimate exceeds the balance", () => {
    const { container } = render(<EstimateRing value={500} max={100} />);

    expect(arcColor(container)).toContain("--status-critical");
    // Clamped: a 500-of-100 estimate would otherwise wrap the circle five times.
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("labels the middle as a share of the balance, not a bare number", () => {
    render(<EstimateRing value={54} max={81} />);

    expect(screen.getByText("67%")).toBeInTheDocument();
  });

  it("survives a zero balance rather than dividing by it", () => {
    const { container } = render(<EstimateRing value={30} max={0} />);
    expect(arcColor(container)).toContain("--status-critical");
  });
});

describe("overBudget", () => {
  it("is true only when the estimate exceeds the balance", () => {
    expect(overBudget(60, 50)).toBe(true);
    expect(overBudget(50, 50)).toBe(false);
    expect(overBudget(10, 50)).toBe(false);
  });
});
