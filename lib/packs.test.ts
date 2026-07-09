import { describe, expect, it } from "vitest";

import { CREDIT_PACKS, getPack, getPackByProductId } from "./packs";

/**
 * getPackByProductId is what the Dodo webhook uses to decide how many credits a
 * payment buys. A wrong answer here grants credits for a product we never sold.
 */

describe("getPack", () => {
  it("resolves the known slugs", () => {
    expect(getPack("basic")?.credits).toBe(100);
    expect(getPack("pro")?.credits).toBe(500);
  });

  it("marks only the Pro pack as tier-upgrading", () => {
    expect(getPack("basic")?.tier).toBe("free");
    expect(getPack("pro")?.tier).toBe("pro");
  });

  it("returns null for an unknown slug rather than throwing", () => {
    expect(getPack("enterprise")).toBeNull();
    expect(getPack("")).toBeNull();
  });

  it("returns null for inherited Object keys, not a function off the prototype", () => {
    // The checkout route passes `String(body.plan)` straight in, so a client can
    // send {"plan":"constructor"}. A bare `CREDIT_PACKS[slug]` lookup would
    // return Object's constructor and sail past the `if (!pack)` guard.
    expect(getPack("constructor")).toBeNull();
    expect(getPack("toString")).toBeNull();
    expect(getPack("__proto__")).toBeNull();
  });
});

describe("getPackByProductId", () => {
  it("reverse-maps a configured product id", () => {
    expect(getPackByProductId("prod_basic")?.slug).toBe("basic");
    expect(getPackByProductId("prod_pro")?.slug).toBe("pro");
  });

  it("returns null for a product we do not sell", () => {
    expect(getPackByProductId("prod_someone_elses")).toBeNull();
  });

  it("returns null for an empty product id", () => {
    expect(getPackByProductId("")).toBeNull();
  });

  it("never matches a pack whose product id is unconfigured", () => {
    // `p.productId === productId` is a strict equality against `string |
    // undefined`. If a caller ever reaches here with undefined — and the webhook
    // reads `item.product_id` off a payload we do not control — an unconfigured
    // pack would match and grant its credits for free.
    expect(getPackByProductId(undefined as unknown as string)).toBeNull();
  });
});

describe("CREDIT_PACKS", () => {
  it("keeps each pack's slug in agreement with its key", () => {
    for (const [key, pack] of Object.entries(CREDIT_PACKS)) {
      expect(pack.slug).toBe(key);
    }
  });

  it("has distinct product ids, so a payment maps to exactly one pack", () => {
    const ids = Object.values(CREDIT_PACKS).map((p) => p.productId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("prices Pro at 5x Basic, matching the $1/$5 pricing page", () => {
    expect(CREDIT_PACKS.pro.credits).toBe(CREDIT_PACKS.basic.credits * 5);
  });
});
