import type { ComponentProps } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type Me, ResearchExperience } from "./research-experience";

/**
 * A render probe for the form tree. SectionPicker sits under SectionsCard, which
 * subscribes to `sections` and nothing else — so it re-renders if and only if
 * the *parent* re-renders. Counting it is how we tell a scoped child update
 * apart from a whole-form one, which a React Profiler cannot do (its onRender
 * fires for any commit in the subtree, including the estimate's own).
 */
const probe = vi.hoisted(() => ({ sectionPickerRenders: 0 }));

vi.mock("./section-picker", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./section-picker")>();
  const Real = actual.SectionPicker;
  return {
    ...actual,
    SectionPicker: (props: ComponentProps<typeof Real>) => {
      probe.sectionPickerRenders++;
      return <Real {...props} />;
    },
  };
});

/**
 * The form keeps its live estimate, its clear button, and its submit gate in
 * child components that own their own field subscriptions. That is a rendering
 * optimization — typing must not re-render the whole form — so these tests pin
 * both halves: the behaviour those children provide, and the render economy
 * that is the reason they exist at all.
 */

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({ data: { user: { name: "Ada" } }, isPending: false }),
  signInWithGoogle: vi.fn(),
}));

const me: Me = {
  signedIn: true,
  user: { name: "Ada", email: "ada@example.com", image: null },
  balance: 200,
  maxRunCredits: 130,
  minRunCredits: 50,
  effortCredits: { low: 60, medium: 90, high: 130 },
  extendCredits: { low: 20, medium: 30, high: 45 },
};

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(me) } as Response))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Renders the form, waiting out the /api/me round-trip the balance gate needs. */
async function renderForm() {
  const result = render(<ResearchExperience initialMe={me} />);
  await screen.findByRole("button", { name: /run reconnaissance/i });
  return result;
}

describe("submit gate", () => {
  it("stays disabled until a company is named", async () => {
    const user = userEvent.setup();
    await renderForm();

    expect(screen.getByRole("button", { name: /run reconnaissance/i })).toBeDisabled();

    await user.type(screen.getByPlaceholderText("Stripe"), "Stripe");

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /run reconnaissance/i })).toBeEnabled()
    );
  });
});

describe("clear form", () => {
  it("appears only once a field diverges from the pristine defaults", async () => {
    const user = userEvent.setup();
    await renderForm();

    expect(screen.queryByRole("button", { name: /clear form/i })).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Stripe"), "Stripe");

    const clear = await screen.findByRole("button", { name: /clear form/i });

    await user.click(clear);

    await waitFor(() => expect(screen.getByPlaceholderText("Stripe")).toHaveValue(""));
    expect(screen.queryByRole("button", { name: /clear form/i })).not.toBeInTheDocument();
  });
});

describe("live estimate", () => {
  it("reprices as the user types, without a submit", async () => {
    const user = userEvent.setup();
    await renderForm();

    const before = screen.getByTestId("estimate-bar").textContent;

    // Naming an interviewer is the cheapest keystroke that provably moves the
    // quote: it buys ~1.5 more searches, and every search pulls sources that
    // then cost tokens to compress. A pasted job description also reprices, but
    // a few hundred characters is well under a credit — it rounds to nothing.
    await user.type(
      screen.getByPlaceholderText(/name \(used only as a public-search seed\)/i),
      "Ada"
    );

    await waitFor(() => expect(screen.getByTestId("estimate-bar").textContent).not.toBe(before));
  });
});

describe("render economy", () => {
  /**
   * The regression this refactor exists to prevent: the form used to hold a bare
   * `watch()`, which subscribes to *every* field, so all four cards and every
   * tooltip re-rendered on each keystroke anywhere in the form. (A *named*
   * `watch("rounds")` is already scoped and does not do this — the bare call was
   * the culprit. Reinstating one here is what makes this test go red.)
   *
   * The estimate must still reprice on every keystroke, so the claim is not
   * "nothing re-renders": it is that the estimate re-renders and the form around
   * it does not.
   */
  it("leaves the form tree alone while the estimate reprices, keystroke by keystroke", async () => {
    const user = userEvent.setup();
    await renderForm();
    await waitFor(() => expect(screen.getByTestId("estimate-bar")).toBeInTheDocument());

    probe.sectionPickerRenders = 0;

    // Company is autofocused, so this is six keystrokes and no focus change.
    await user.type(screen.getByPlaceholderText("Stripe"), "Stripe");
    expect(screen.getByPlaceholderText("Stripe")).toHaveValue("Stripe");
    expect(probe.sectionPickerRenders).toBe(0);

    // Land in the next field *first*: the form validates `mode: "onBlur"`, and
    // that one blur legitimately re-renders the tree to surface any error. It is
    // once per field exit, not once per keystroke — which is the whole point, so
    // take it before zeroing the probe rather than letting it pollute the count.
    const interviewer = screen.getByPlaceholderText(/name \(used only as a public-search seed\)/i);
    await user.click(interviewer);

    const quoteBefore = screen.getByTestId("estimate-bar").textContent;
    probe.sectionPickerRenders = 0;

    // The estimate is genuinely live, not merely cheap: a field it *does* price
    // still moves the quote, and still without waking the pickers.
    await user.type(interviewer, "Ada");
    await waitFor(() =>
      expect(screen.getByTestId("estimate-bar").textContent).not.toBe(quoteBefore)
    );
    expect(probe.sectionPickerRenders).toBe(0);
  });

  it("still re-renders the pickers when their own field changes", async () => {
    const user = userEvent.setup();
    await renderForm();

    probe.sectionPickerRenders = 0;
    const chip = screen.getByRole("button", { name: /the company/i });
    expect(chip).toHaveAttribute("aria-pressed", "true");

    await user.click(chip);

    expect(probe.sectionPickerRenders).toBeGreaterThan(0);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /the company/i })).toHaveAttribute(
        "aria-pressed",
        "false"
      )
    );
  });
});
