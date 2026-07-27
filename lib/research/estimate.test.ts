import { describe, expect, it } from "vitest";

import { effortCredits, extendCredits } from "@/lib/pricing";

import { type EstimateInput, estimateExtend, estimateRun, hintMidpoint } from "./estimate";

const CEILINGS = effortCredits();
const EXTEND_CEILINGS = extendCredits();

/** The form's pristine defaults: 2 rounds, all 4 sections, medium effort. */
const defaults: EstimateInput = {
  effort: "medium",
  roundsCount: 2,
  sectionsCount: 4,
  interviewersCount: 0,
  jobDescriptionLength: 0,
  hasCompanyUrl: false,
};

function run(overrides: Partial<EstimateInput> = {}) {
  const input = { ...defaults, ...overrides };
  return estimateRun(input, CEILINGS[input.effort]);
}

describe("hintMidpoint", () => {
  it("averages a range", () => {
    expect(hintMidpoint("4-8")).toBe(6);
    expect(hintMidpoint("15-30")).toBe(22.5);
  });

  it("passes a single number through", () => {
    expect(hintMidpoint("5")).toBe(5);
  });
});

describe("estimateRun", () => {
  it("brackets a higher-recall medium run around 60 credits", () => {
    const { minCredits, maxCredits } = run();
    expect(minCredits).toBeLessThanOrEqual(60);
    expect(maxCredits).toBeGreaterThanOrEqual(60);
  });

  it("returns a range, not a point", () => {
    const { minCredits, maxCredits, minMinutes, maxMinutes } = run();
    expect(minCredits).toBeLessThan(maxCredits);
    expect(minMinutes).toBeLessThan(maxMinutes);
  });

  it("never promises a cost the run cannot reach: the effort ceiling is a hard cap", () => {
    // Absurd inputs, every knob maxed — still bounded by what the pipeline can spend.
    const huge = run({
      effort: "high",
      roundsCount: 40,
      sectionsCount: 4,
      interviewersCount: 30,
      jobDescriptionLength: 500_000,
    });
    expect(huge.maxCredits).toBeLessThanOrEqual(CEILINGS.high);
    expect(huge.minCredits).toBeLessThanOrEqual(huge.maxCredits);
  });

  it("costs more with more rounds", () => {
    expect(run({ roundsCount: 5 }).maxCredits).toBeGreaterThan(run({ roundsCount: 1 }).maxCredits);
  });

  it("costs more with more sections", () => {
    expect(run({ sectionsCount: 4 }).maxCredits).toBeGreaterThan(
      run({ sectionsCount: 0 }).maxCredits
    );
  });

  it("costs more with more interviewers", () => {
    expect(run({ interviewersCount: 3 }).maxCredits).toBeGreaterThan(
      run({ interviewersCount: 0 }).maxCredits
    );
  });

  it("costs more with a long job description", () => {
    expect(run({ jobDescriptionLength: 8_000 }).maxCredits).toBeGreaterThan(
      run({ jobDescriptionLength: 0 }).maxCredits
    );
  });

  it("costs more at higher effort", () => {
    const low = estimateRun({ ...defaults, effort: "low" }, CEILINGS.low);
    const medium = estimateRun({ ...defaults, effort: "medium" }, CEILINGS.medium);
    const high = estimateRun({ ...defaults, effort: "high" }, CEILINGS.high);
    expect(medium.maxCredits).toBeGreaterThan(low.maxCredits);
    expect(high.maxCredits).toBeGreaterThan(medium.maxCredits);
  });

  it("takes longer at higher effort", () => {
    const low = estimateRun({ ...defaults, effort: "low" }, CEILINGS.low);
    const high = estimateRun({ ...defaults, effort: "high" }, CEILINGS.high);
    expect(high.maxMinutes).toBeGreaterThan(low.maxMinutes);
  });

  it("stays at least a minute even for the smallest run", () => {
    const tiny = estimateRun(
      { ...defaults, effort: "low", roundsCount: 1, sectionsCount: 0 },
      CEILINGS.low
    );
    expect(tiny.minMinutes).toBeGreaterThanOrEqual(1);
    expect(tiny.minCredits).toBeGreaterThanOrEqual(1);
  });
});

describe("estimateExtend", () => {
  it("costs less than a full run at the same effort", () => {
    const extension = estimateExtend(2, "medium", EXTEND_CEILINGS.medium);
    expect(extension.maxCredits).toBeLessThan(run().maxCredits);
  });

  it("is capped by the extension ceiling, which is half the full-run one", () => {
    const extension = estimateExtend(20, "high", EXTEND_CEILINGS.high);
    expect(extension.maxCredits).toBeLessThanOrEqual(EXTEND_CEILINGS.high);
  });

  it("costs more with more rounds", () => {
    expect(estimateExtend(4, "medium", EXTEND_CEILINGS.medium).maxCredits).toBeGreaterThan(
      estimateExtend(1, "medium", EXTEND_CEILINGS.medium).maxCredits
    );
  });
});
