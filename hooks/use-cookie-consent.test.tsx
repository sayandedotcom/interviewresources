import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { COOKIE_CONSENT_STORAGE_KEY, useCookieConsent } from "./use-cookie-consent";

describe("useCookieConsent", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts as null when nothing is stored", () => {
    const { result } = renderHook(() => useCookieConsent());
    expect(result.current.consent).toBeNull();
  });

  it("reads a previously accepted consent from localStorage on mount", () => {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "accepted");
    const { result } = renderHook(() => useCookieConsent());
    expect(result.current.consent).toBe("accepted");
  });

  it("persists accept and updates state", () => {
    const { result } = renderHook(() => useCookieConsent());

    act(() => {
      result.current.setConsent("accepted");
    });

    expect(result.current.consent).toBe("accepted");
    expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe("accepted");
  });

  it("clearing consent removes it from localStorage", () => {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "rejected");
    const { result } = renderHook(() => useCookieConsent());

    act(() => {
      result.current.setConsent(null);
    });

    expect(result.current.consent).toBeNull();
    expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBeNull();
  });

  it("syncs a second hook instance in the same tab via the change event", () => {
    const a = renderHook(() => useCookieConsent());
    const b = renderHook(() => useCookieConsent());

    act(() => {
      a.result.current.setConsent("rejected");
    });

    expect(b.result.current.consent).toBe("rejected");
  });
});
