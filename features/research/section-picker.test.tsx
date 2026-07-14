import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { REPORT_SECTIONS } from "@/lib/research/types";

import { SectionPicker } from "./section-picker";

describe("SectionPicker", () => {
  it("offers every optional section", () => {
    render(<SectionPicker selected={[...REPORT_SECTIONS]} onToggle={vi.fn()} />);

    expect(screen.getByRole("button", { name: /The company/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /The loop/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Skills required/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Interview experiences/ })).toBeInTheDocument();
  });

  it("marks only the selected sections as pressed", () => {
    render(<SectionPicker selected={["skills"]} onToggle={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Skills required/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: /The company/ })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("toggles a section the user clicks", async () => {
    const onToggle = vi.fn();
    render(<SectionPicker selected={[...REPORT_SECTIONS]} onToggle={onToggle} />);

    await userEvent.click(screen.getByRole("button", { name: /The company/ }));

    expect(onToggle).toHaveBeenCalledWith("company");
  });

  it("cannot be changed while a run is in flight", async () => {
    const onToggle = vi.fn();
    render(<SectionPicker selected={[...REPORT_SECTIONS]} onToggle={onToggle} disabled />);

    await userEvent.click(screen.getByRole("button", { name: /The loop/ }));

    expect(onToggle).not.toHaveBeenCalled();
  });
});
