import { beforeEach, describe, expect, it } from "vitest";

import {
  FORM_DRAFT_KEY,
  clearDraft,
  emptyFormValues,
  isDraftDirty,
  loadDraft,
  saveDraft,
} from "./form-schema";

describe("form draft persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns null when nothing has been saved", () => {
    expect(loadDraft()).toBeNull();
  });

  it("round-trips saved values", () => {
    const values = { ...emptyFormValues, company: "Stripe", location: "Remote" };
    saveDraft(values);
    expect(loadDraft()).toEqual(values);
  });

  it("returns null for garbage stored under the draft key", () => {
    window.localStorage.setItem(FORM_DRAFT_KEY, "{not json");
    expect(loadDraft()).toBeNull();
  });

  it("fills in missing fields from defaults, so an old draft schema still loads", () => {
    window.localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify({ company: "Stripe" }));
    const draft = loadDraft();
    expect(draft?.company).toBe("Stripe");
    expect(draft?.rounds).toEqual(emptyFormValues.rounds);
  });

  it("removes the draft on clear", () => {
    saveDraft({ ...emptyFormValues, company: "Stripe" });
    clearDraft();
    expect(loadDraft()).toBeNull();
  });
});

describe("isDraftDirty", () => {
  it("is false for the pristine defaults", () => {
    expect(isDraftDirty(emptyFormValues)).toBe(false);
  });

  it("is true once a field diverges", () => {
    expect(isDraftDirty({ ...emptyFormValues, company: "Stripe" })).toBe(true);
  });
});
