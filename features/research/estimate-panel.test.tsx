import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { Estimate } from "@/lib/research/estimate";

import { EstimateInline, EstimatePanel } from "./estimate-panel";

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
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(within(bar).queryByText(/Estimate only/)).not.toBeInTheDocument();

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(bar).getByText(/Estimate only/)).toBeInTheDocument();
  });
});

describe("EstimateInline", () => {
  it("prices an extension, disclaimer and all", () => {
    render(
      <EstimateInline
        estimate={{ minCredits: 17, maxCredits: 31, minMinutes: 1, maxMinutes: 4 }}
        balance={200}
      />
    );

    const inline = screen.getByTestId("estimate-inline");
    expect(within(inline).getByText(/~17–31/)).toBeInTheDocument();
    expect(within(inline).getByText(/~1–4 min/)).toBeInTheDocument();
    expect(within(inline).getByText(/Estimate only/)).toBeInTheDocument();
  });

  it("warns when an extension could outrun the balance", () => {
    render(
      <EstimateInline
        estimate={{ minCredits: 17, maxCredits: 31, minMinutes: 1, maxMinutes: 4 }}
        balance={25}
      />
    );

    expect(screen.getByText(/could cost more than your 25 credits/)).toBeInTheDocument();
  });
});
