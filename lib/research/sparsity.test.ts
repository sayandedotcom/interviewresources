import { describe, expect, it } from "vitest";

import {
  MIN_DIRECT_CONTENT_CHARS,
  SPARSE_DIRECT_THRESHOLD,
  assessEvidenceDensity,
} from "./sparsity";
import type { GatheredSource } from "./types";

function source(overrides: Partial<GatheredSource> = {}): GatheredSource {
  return {
    url: "https://example.com",
    title: "Title",
    category: "interview_experience",
    content: "x".repeat(MIN_DIRECT_CONTENT_CHARS),
    extracted: false,
    ...overrides,
  };
}

/** N direct sources, each with distinct urls so nothing collapses. */
function directSources(n: number, overrides: Partial<GatheredSource> = {}): GatheredSource[] {
  return Array.from({ length: n }, (_, i) => source({ url: `https://s${i}.dev`, ...overrides }));
}

describe("assessEvidenceDensity", () => {
  it("treats an empty gather as sparse", () => {
    const density = assessEvidenceDensity([]);
    expect(density.directSources).toBe(0);
    expect(density.sparse).toBe(true);
  });

  it("treats a couple of thin snippets as sparse", () => {
    const density = assessEvidenceDensity(directSources(2));
    expect(density.directSources).toBe(2);
    expect(density.extractedDirect).toBe(0);
    expect(density.sparse).toBe(true);
  });

  it("does not count snippets below the content floor", () => {
    const density = assessEvidenceDensity(
      directSources(5, { content: "x".repeat(MIN_DIRECT_CONTENT_CHARS - 1) })
    );
    expect(density.directSources).toBe(0);
    expect(density.sparse).toBe(true);
  });

  it("clears sparsity with five substantive sources, one of them extracted", () => {
    const sources = directSources(5);
    sources[0].extracted = true;
    const density = assessEvidenceDensity(sources);
    expect(density.directSources).toBe(5);
    expect(density.extractedDirect).toBe(1);
    expect(density.sparse).toBe(false);
  });

  it("stays sparse at four snippet-only sources with nothing extracted", () => {
    // Enough to clear the hard floor, but not one full page was read behind
    // them, so the run still broadens.
    const density = assessEvidenceDensity(directSources(4));
    expect(density.directSources).toBe(4);
    expect(density.extractedDirect).toBe(0);
    expect(density.sparse).toBe(true);
  });

  it("clears sparsity at five sources even with nothing extracted", () => {
    // Five substantive snippets are enough on their own; the extract-fallback
    // branch only applies below five.
    const density = assessEvidenceDensity(directSources(5));
    expect(density.directSources).toBe(5);
    expect(density.extractedDirect).toBe(0);
    expect(density.sparse).toBe(false);
  });

  it("clears sparsity at the threshold when a page was extracted", () => {
    const sources = directSources(SPARSE_DIRECT_THRESHOLD);
    sources[0].extracted = true;
    const density = assessEvidenceDensity(sources);
    expect(density.directSources).toBe(SPARSE_DIRECT_THRESHOLD);
    // 3 direct with an extract clears the count floor, and 3 < 5 with an extract
    // present means the extracted-fallback branch does not trip.
    expect(density.sparse).toBe(false);
  });

  it("ignores company and interviewer sources when measuring interview density", () => {
    const sources = [
      source({ url: "https://co.dev", category: "company", extracted: true }),
      source({ url: "https://who.dev", category: "interviewer", extracted: true }),
      source({ url: "https://who2.dev", category: "interviewer" }),
    ];
    const density = assessEvidenceDensity(sources);
    expect(density.directSources).toBe(0);
    expect(density.sparse).toBe(true);
  });

  it("counts round-category sources as direct interview signal", () => {
    const sources = directSources(5, { category: "dsa" });
    sources[0].extracted = true;
    const density = assessEvidenceDensity(sources);
    expect(density.directSources).toBe(5);
    expect(density.sparse).toBe(false);
  });
});
