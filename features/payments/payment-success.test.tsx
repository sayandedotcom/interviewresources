import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PaymentSuccess } from "./payment-success";

/**
 * Two failures this screen shipped with, both seen in a real test purchase:
 *
 * 1. `status` was ignored entirely, so a declined payment rendered "Payment
 *    received" and invited the user to wait for credits that never existed.
 * 2. Settlement was inferred from `balance > 0`, which is already true for any
 *    returning customer — the screen declared success without the purchase
 *    having landed.
 */

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const json = (body: unknown) => ({ json: async () => body });

describe("a failed payment", () => {
  it("says the payment failed rather than that it was received", async () => {
    render(<PaymentSuccess status="failed" paymentId="pay_1" />);

    expect(screen.getByText("Payment failed")).toBeInTheDocument();
    expect(screen.queryByText("Payment received")).not.toBeInTheDocument();
  });

  it("states plainly that no money was taken and no credits added", () => {
    render(<PaymentSuccess status="failed" paymentId="pay_1" />);

    expect(screen.getByText(/have not been charged/i)).toBeInTheDocument();
    expect(screen.queryByText(/still being applied/i)).not.toBeInTheDocument();
  });

  it("never polls, because there is no grant coming", () => {
    render(<PaymentSuccess status="failed" paymentId="pay_1" />);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats a cancelled checkout as a failure too, in either spelling", () => {
    const { unmount } = render(<PaymentSuccess status="cancelled" paymentId="pay_1" />);
    expect(screen.getByText("Payment failed")).toBeInTheDocument();
    unmount();

    render(<PaymentSuccess status="canceled" paymentId="pay_1" />);
    expect(screen.getByText("Payment failed")).toBeInTheDocument();
  });

  it("is case-insensitive about the status Dodo sends", () => {
    render(<PaymentSuccess status="FAILED" paymentId="pay_1" />);

    expect(screen.getByText("Payment failed")).toBeInTheDocument();
  });
});

describe("a succeeded payment", () => {
  it("asks about this specific payment, not just the balance", async () => {
    fetchMock.mockResolvedValue(json({ signedIn: true, balance: 100, credited: true }));

    render(<PaymentSuccess status="succeeded" paymentId="pay_abc" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/api/me?payment_id=pay_abc");
  });

  it("reports the new balance once the grant has landed", async () => {
    fetchMock.mockResolvedValue(json({ signedIn: true, balance: 100, credited: true }));

    render(<PaymentSuccess status="succeeded" paymentId="pay_abc" />);

    expect(await screen.findByText(/100 credits/)).toBeInTheDocument();
  });

  it("keeps waiting for a returning customer whose grant has not arrived", async () => {
    // The bug: 420 credits already on the account, this payment uncredited.
    // The old `balance > 0` check called that settled and showed a stale total.
    fetchMock.mockResolvedValue(json({ signedIn: true, balance: 420, credited: false }));

    render(<PaymentSuccess status="succeeded" paymentId="pay_abc" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByText(/Adding your credits/i)).toBeInTheDocument();
    expect(screen.queryByText(/420 credits/)).not.toBeInTheDocument();
  });

  it("percent-encodes the payment id into the query", async () => {
    fetchMock.mockResolvedValue(json({ signedIn: true, balance: 1, credited: true }));

    render(<PaymentSuccess status="succeeded" paymentId="pay a&b" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/me?payment_id=pay%20a%26b"));
  });

  it("falls back to the balance when no payment id came back in the url", async () => {
    fetchMock.mockResolvedValue(json({ signedIn: true, balance: 100 }));

    render(<PaymentSuccess status="succeeded" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/me"));
    expect(await screen.findByText(/100 credits/)).toBeInTheDocument();
  });

  it("survives a network error without crashing the screen", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    render(<PaymentSuccess status="succeeded" paymentId="pay_abc" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByText("Payment received")).toBeInTheDocument();
  });
});

describe("no status at all", () => {
  it("polls rather than assuming failure, so an unknown status is not a false alarm", async () => {
    fetchMock.mockResolvedValue(json({ signedIn: true, balance: 100, credited: true }));

    render(<PaymentSuccess paymentId="pay_abc" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByText("Payment failed")).not.toBeInTheDocument();
  });
});
