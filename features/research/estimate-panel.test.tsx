import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { Estimate } from "@/lib/research/estimate";

import { EstimatePanel } from "./estimate-panel";

const estimate: Estimate = { minCredits: 29, maxCredits: 54, minMinutes: 2, maxMinutes: 5 };

describe("EstimatePanel", () => {
  it("shows the credit and time ranges", () => {
    render(<EstimatePanel estimate={estimate} balance={200} ceiling={130} />);

    const rail = screen.getByTestId("estimate-rail");
    expect(within(rail).getByText(/~29–54/)).toBeInTheDocument();
    expect(within(rail).getByText(/~2–5 min/)).toBeInTheDocument();
  });

  it("never lets the estimate read as a promise", () => {
    render(<EstimatePanel estimate={estimate} balance={200} />);

    const rail = screen.getByTestId("estimate-rail");
    expect(within(rail).getByText(/Estimate only/)).toBeInTheDocument();
    expect(within(rail).getByText(/may be more or less/)).toBeInTheDocument();
  });

  it("shows the balance it is measuring against", () => {
    render(<EstimatePanel estimate={estimate} balance={200} ceiling={130} />);

    const rail = screen.getByTestId("estimate-rail");
    expect(within(rail).getByText("200")).toBeInTheDocument();
    expect(within(rail).getByText(/cap 130/)).toBeInTheDocument();
  });

  it("warns when the run could outrun the balance", () => {
    render(<EstimatePanel estimate={estimate} balance={40} />);

    const rail = screen.getByTestId("estimate-rail");
    expect(within(rail).getByText(/could cost more than your 40 credits/)).toBeInTheDocument();
  });

  it("stays quiet when the balance covers the run", () => {
    render(<EstimatePanel estimate={estimate} balance={200} />);

    expect(screen.queryByText(/could cost more than/)).not.toBeInTheDocument();
  });

  it("still prices the run for a signed-out visitor, without a balance to ring", () => {
    render(<EstimatePanel estimate={estimate} />);

    const rail = screen.getByTestId("estimate-rail");
    expect(within(rail).getByText(/~29–54/)).toBeInTheDocument();
    expect(within(rail).queryByText(/Balance:/)).not.toBeInTheDocument();
  });

  it("keeps the mobile bar collapsed until it is asked to open", async () => {
    render(<EstimatePanel estimate={estimate} balance={200} />);

    const bar = screen.getByTestId("estimate-bar");
    const toggle = within(bar).getByRole("button");
    // The panel stays mounted so it can grow out of the bar rather than pop into
    // existence above it, so "collapsed" is a state to assert, not an absence:
    // clipped to zero height and `inert`, which is what actually keeps its
    // contents off the tab order and away from a screen reader.
    const panel = screen.getByTestId("estimate-bar-panel");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(panel).not.toHaveAttribute("data-open");
    expect(panel).toHaveAttribute("inert");

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(panel).toHaveAttribute("data-open");
    expect(panel).not.toHaveAttribute("inert");
    expect(within(bar).getByText(/Estimate only/)).toBeInTheDocument();
  });

  it("renders extra controls in the rail, and in the bar once opened", async () => {
    render(
      <EstimatePanel estimate={estimate} balance={200} controls={<p>Effort picker slot</p>} />
    );

    const rail = screen.getByTestId("estimate-rail");
    expect(within(rail).getByText("Effort picker slot")).toBeInTheDocument();

    // Mounted but inert while collapsed — see the note in the test above.
    const bar = screen.getByTestId("estimate-bar");
    expect(screen.getByTestId("estimate-bar-panel")).toHaveAttribute("inert");
    await userEvent.click(within(bar).getByRole("button"));
    expect(screen.getByTestId("estimate-bar-panel")).not.toHaveAttribute("inert");
    expect(within(bar).getByText("Effort picker slot")).toBeInTheDocument();
  });
});
