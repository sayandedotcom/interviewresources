import { describe, expect, it } from "vitest";

import {
  CREDIT_PACK_CATALOG,
  ECONOMICS,
  ECONOMICS_VERSION,
  estimateDodoTransactionFeeMicros,
  getPackEconomics,
  microsToUsd,
} from "./economics";

describe("shared credit-pack economics", () => {
  it("publishes the launch prices and unchanged credit grants from one catalog", () => {
    expect(CREDIT_PACK_CATALOG).toEqual([
      { slug: "starter", name: "Starter", credits: 100, priceUsdMinor: 149 },
      { slug: "bundle", name: "Bundle", credits: 550, priceUsdMinor: 649 },
      { slug: "max", name: "Max", credits: 1_200, priceUsdMinor: 1_249 },
    ]);
  });

  it("applies Dodo's percentage and fixed fee to every pack", () => {
    expect(estimateDodoTransactionFeeMicros(149)).toBe(459_600);
    expect(estimateDodoTransactionFeeMicros(649)).toBe(659_600);
    expect(estimateDodoTransactionFeeMicros(1_249)).toBe(899_600);
  });

  it("keeps full-redemption base contribution above the 20% floor", () => {
    const starter = getPackEconomics("starter");
    const bundle = getPackEconomics("bundle");
    const max = getPackEconomics("max");

    expect(microsToUsd(starter.contributionMicros)).toBeCloseTo(0.261169, 6);
    expect(microsToUsd(bundle.contributionMicros)).toBeCloseTo(1.599631, 6);
    expect(microsToUsd(max.contributionMicros)).toBeCloseTo(2.359631, 6);
    expect(
      [starter, bundle, max].every(
        (pack) =>
          pack.contributionMicros > 0 && pack.contributionMargin >= ECONOMICS.margins.baseFloor
      )
    ).toBe(true);
  });

  it("keeps eligible referred contribution above the 5% floor", () => {
    const bundle = getPackEconomics("bundle", true);
    const max = getPackEconomics("max", true);

    expect(microsToUsd(bundle.contributionMicros)).toBeCloseTo(0.445785, 6);
    expect(microsToUsd(max.contributionMicros)).toBeCloseTo(1.205785, 6);
    expect(
      [bundle, max].every(
        (pack) =>
          pack.contributionMicros > 0 && pack.contributionMargin >= ECONOMICS.margins.referredFloor
      )
    ).toBe(true);
  });

  it("versions the provider rates and non-transaction loss assumptions", () => {
    expect(ECONOMICS.version).toBe(ECONOMICS_VERSION);
    expect(ECONOMICS.providers.dodo.refundFeeUsd).toBe(1);
    expect(ECONOMICS.providers.dodo.disputeFeeUsd).toBe(30);
    expect(ECONOMICS.providers.dodo.payoutFeeUsd).toBe(5);
    expect(ECONOMICS.monthlyFixedCostsUsd).toBe(0);
  });
});
