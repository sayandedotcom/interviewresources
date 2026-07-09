import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  CREDIT_MARKUP,
  MAX_RUN_CREDITS,
  MIN_RUN_CREDITS,
  USD_PER_CREDIT,
  creditsToBudgetUsd,
  usdToCredits,
} from "./credits";
import { BUDGET_CAP_USD } from "./research/budget";

/**
 * These are the money functions. Everything else in the app can be wrong and a
 * user gets a bad report; if these are wrong, a user is overcharged or gets a
 * run for free. They are pure, so they get the heaviest coverage in the repo,
 * including property tests for the one invariant the whole no-reservation
 * billing design rests on.
 */

describe("usdToCredits", () => {
  it("applies the markup and converts to whole credits", () => {
    // $0.35 * 1.3 = $0.455 → 45.5 credits → 46
    expect(usdToCredits(0.35)).toBe(46);
  });

  it("charges nothing for a run that cost nothing", () => {
    expect(usdToCredits(0)).toBe(0);
  });

  it("rounds up, so a sub-cent run still costs one credit", () => {
    expect(usdToCredits(0.0001)).toBe(1);
  });

  it("charges MAX_RUN_CREDITS at the hard budget cap", () => {
    expect(usdToCredits(BUDGET_CAP_USD)).toBe(MAX_RUN_CREDITS);
    expect(MAX_RUN_CREDITS).toBe(130);
  });

  it("does not overcharge by a credit on float dust from the inverse", () => {
    // This is the exact regression the toFixed(6) in usdToCredits guards.
    // creditsToBudgetUsd(56) * 1.3 / 0.01 evaluates to 56.00000000000001, and a
    // bare Math.ceil would bill 57.
    const usd = creditsToBudgetUsd(56);
    expect(usdToCredits(usd)).toBe(56);
  });
});

describe("creditsToBudgetUsd", () => {
  it("is the inverse of usdToCredits", () => {
    expect(creditsToBudgetUsd(130)).toBeCloseTo(BUDGET_CAP_USD, 10);
  });

  it("gives the 50-credit floor a budget under the $1 cap", () => {
    const usd = creditsToBudgetUsd(MIN_RUN_CREDITS);
    expect(usd).toBeCloseTo(0.3846, 4);
    expect(usd).toBeLessThan(BUDGET_CAP_USD);
  });

  it("would let a balance buy more than the cap allows, which is why the route clamps", () => {
    // The route computes min(BUDGET_CAP_USD, creditsToBudgetUsd(balance)).
    // Without that clamp a rich user would run a $7.69 pipeline.
    expect(creditsToBudgetUsd(1000)).toBeGreaterThan(BUDGET_CAP_USD);
  });
});

describe("pack affordability", () => {
  it("a 100-credit Basic pack cannot cover a worst-case run, so runs must not gate on MAX_RUN_CREDITS", () => {
    // Documents the reasoning in the MAX_RUN_CREDITS docstring: gating on it
    // would make the Basic pack unusable.
    expect(MAX_RUN_CREDITS).toBeGreaterThan(100);
  });

  it("the Basic pack clears the minimum-run floor", () => {
    expect(100).toBeGreaterThanOrEqual(MIN_RUN_CREDITS);
  });
});

describe("the billing invariant", () => {
  /**
   * The route never reserves credits. It caps the pipeline's dollar budget at
   * what the balance can buy, then charges the real cost afterwards. That is
   * only safe if: for every balance at or above the floor, and every run cost
   * within the capped budget, the resulting charge is at most the balance.
   *
   * If this property ever fails, users can drive their balance negative.
   */
  it("a run that respects its capped budget can never charge more than the balance", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MIN_RUN_CREDITS, max: 100_000 }),
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        (balance, spendFraction) => {
          const capUsd = Math.min(BUDGET_CAP_USD, creditsToBudgetUsd(balance));
          const costUsd = capUsd * spendFraction;

          expect(usdToCredits(costUsd)).toBeLessThanOrEqual(balance);
        }
      ),
      { numRuns: 2000 }
    );
  });

  it("charge is monotonic in cost — a more expensive run never bills less", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        (a, b) => {
          const [lo, hi] = a <= b ? [a, b] : [b, a];
          expect(usdToCredits(lo)).toBeLessThanOrEqual(usdToCredits(hi));
        }
      ),
      { numRuns: 1000 }
    );
  });

  it("round-tripping an integer credit balance through dollars is lossless", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100_000 }), (credits) => {
        expect(usdToCredits(creditsToBudgetUsd(credits))).toBe(credits);
      }),
      { numRuns: 2000 }
    );
  });
});

describe("constants", () => {
  it("holds the pricing contract the UI copy and PRD §7 both assume", () => {
    expect(USD_PER_CREDIT).toBe(0.01);
    expect(CREDIT_MARKUP).toBe(1.3);
    expect(MIN_RUN_CREDITS).toBe(50);
    expect(MAX_RUN_CREDITS).toBe(Math.ceil((BUDGET_CAP_USD * CREDIT_MARKUP) / USD_PER_CREDIT));
  });
});
