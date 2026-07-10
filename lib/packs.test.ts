import { describe, expect, it } from "vitest";

import { pricingConfig } from "@/config/pricing";

import { CREDIT_PACKS, getPack, getPackByProductId } from "./packs";

/**
 * getPackByProductId is what the Dodo webhook uses to decide how many credits a
 * payment buys. A wrong answer here grants credits for a product we never sold.
 */

describe("getPack", () => {
  it("resolves the known slugs", () => {
    expect(getPack("starter")?.credits).toBe(100);
    expect(getPack("bundle")?.credits).toBe(550);
    expect(getPack("max")?.credits).toBe(1200);
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
    expect(getPackByProductId("prod_starter")?.slug).toBe("starter");
    expect(getPackByProductId("prod_bundle")?.slug).toBe("bundle");
    expect(getPackByProductId("prod_max")?.slug).toBe("max");
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

  it("grants the advertised bonus over the flat 100-credits-per-dollar rate", () => {
    // The bonuses are the reason to buy a bigger pack, so a change to any of
    // these numbers is a change to the offer the pricing page makes.
    expect(CREDIT_PACKS.starter.credits).toBe(100); // $1, flat
    expect(CREDIT_PACKS.bundle.credits).toBe(550); // $5 → 500 flat + 10%
    expect(CREDIT_PACKS.max.credits).toBe(1200); // $10 → 1000 flat + 20%
  });

  it("makes each larger pack a strictly better rate, so the ladder never inverts", () => {
    const perDollar = [
      CREDIT_PACKS.starter.credits / 1,
      CREDIT_PACKS.bundle.credits / 5,
      CREDIT_PACKS.max.credits / 10,
    ];
    expect(perDollar[0]).toBeLessThan(perDollar[1]);
    expect(perDollar[1]).toBeLessThan(perDollar[2]);
  });
});

/**
 * config/pricing.ts advertises the credits; CREDIT_PACKS grants them. Only a
 * comment keeps the two in step, so a drift would quietly sell 500 credits and
 * hand over 100. Pin it.
 */
describe("the pricing page agrees with what the webhook grants", () => {
  it("advertises exactly the packs that checkout sells", () => {
    expect(pricingConfig.plans.map((p) => p.slug).sort()).toEqual(Object.keys(CREDIT_PACKS).sort());
  });

  it("advertises each pack's real credit grant and name", () => {
    for (const plan of pricingConfig.plans) {
      expect(CREDIT_PACKS[plan.slug].credits).toBe(plan.credits);
      expect(CREDIT_PACKS[plan.slug].name).toBe(plan.name);
    }
  });
});
