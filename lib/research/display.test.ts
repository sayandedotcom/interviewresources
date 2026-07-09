import { describe, expect, it } from "vitest";

import { CATEGORY_META, CONFIDENCE_META, categoryCode, categoryLabel } from "./display";
import { INTERVIEW_CATEGORIES } from "./types";

/**
 * These render into the report UI for every question. The interesting cases are
 * the custom rounds — free-form identifiers the model copies verbatim from user
 * input, which means anything can arrive here.
 */

describe("categoryLabel", () => {
  it("uses the curated label for a known category", () => {
    expect(categoryLabel("dsa")).toBe("Algorithmic Coding");
    expect(categoryLabel("hr_culture")).toBe("HR / Culture");
  });

  it("title-cases a custom round identifier", () => {
    expect(categoryLabel("live_debugging")).toBe("Live Debugging");
  });

  it("handles a single-word custom round", () => {
    expect(categoryLabel("bar_raiser")).toBe("Bar Raiser");
  });

  it("leaves an empty identifier empty rather than throwing", () => {
    expect(categoryLabel("")).toBe("");
  });
});

describe("categoryCode", () => {
  it("uses the curated short code for a known category", () => {
    expect(categoryCode("system_design")).toBe("SYS");
    expect(categoryCode("pair_programming")).toBe("PAIR");
  });

  it("takes the first four alphanumerics of a custom round", () => {
    expect(categoryCode("live_debugging")).toBe("LIVE");
  });

  it("strips separators before slicing, so the code is never a stray underscore", () => {
    expect(categoryCode("a_b_c_d_e")).toBe("ABCD");
  });

  it("falls back to RND when nothing alphanumeric survives", () => {
    expect(categoryCode("___")).toBe("RND");
    expect(categoryCode("")).toBe("RND");
    expect(categoryCode("!!!")).toBe("RND");
  });

  it("never emits more than four characters, whatever the model returns", () => {
    const long = "a".repeat(200);
    expect(categoryCode(long)).toHaveLength(4);
  });

  it("does not confuse a custom round that merely contains a known key", () => {
    // "dsa" is known; "dsa_advanced" is not, and must take the custom path.
    expect(categoryCode("dsa_advanced")).toBe("DSAA");
    expect(categoryLabel("dsa_advanced")).toBe("Dsa Advanced");
  });

  it("does not treat inherited Object.prototype keys as known categories", () => {
    // `cat in CATEGORY_META` is true for "toString" on a plain object literal.
    // If this regresses, categoryCode reads a function off the prototype.
    expect(categoryCode("toString")).toBe("TOST");
    expect(categoryLabel("constructor")).toBe("Constructor");
  });
});

describe("CATEGORY_META", () => {
  it("covers every category the pipeline can plan for", () => {
    for (const cat of INTERVIEW_CATEGORIES) {
      expect(CATEGORY_META[cat]).toBeDefined();
      expect(CATEGORY_META[cat].label).not.toBe("");
      expect(CATEGORY_META[cat].code).not.toBe("");
    }
  });

  it("has no duplicate short codes, which would make two rounds indistinguishable", () => {
    const codes = Object.values(CATEGORY_META).map((m) => m.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("CONFIDENCE_META", () => {
  it("maps each confidence level the report schema allows", () => {
    expect(CONFIDENCE_META.high.signal).toBe("●●●");
    expect(CONFIDENCE_META.medium.signal).toBe("●●○");
    expect(CONFIDENCE_META.low.signal).toBe("●○○");
  });
});
