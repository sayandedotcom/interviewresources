import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CreditsBadge } from "./credits-badge";

describe("CreditsBadge", () => {
  it("renders the balance", () => {
    render(<CreditsBadge balance={454} />);

    expect(screen.getByText("454")).toBeInTheDocument();
  });

  it("renders an em dash while the balance is still loading", () => {
    render(<CreditsBadge balance={null} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("distinguishes a zero balance from an unknown one", () => {
    render(<CreditsBadge balance={0} />);

    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });

  it("shows a negative balance, which is what a raced run leaves behind", () => {
    render(<CreditsBadge balance={-10} />);

    expect(screen.getByText("-10")).toBeInTheDocument();
  });

  it("merges a caller's className", () => {
    const { container } = render(<CreditsBadge balance={1} className="ml-2" />);

    expect(container.querySelector(".ml-2")).toBeInTheDocument();
  });
});
