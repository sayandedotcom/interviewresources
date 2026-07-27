import { describe, expect, it } from "vitest";

import {
  SAMPLE_COMPANY,
  SAMPLE_LOCATION,
  SAMPLE_REPORT,
  SAMPLE_RESEARCH_ID,
  SAMPLE_ROLE,
  SAMPLE_SUMMARY,
} from "./sample-report";
import { storedReportSchema } from "./types";

describe("SAMPLE_REPORT", () => {
  // The point of this file. The sample is a hardcoded capture rendered through
  // the same ReportView as a real report, so a schema change it no longer
  // satisfies has to fail here rather than on the page.
  it("parses as a stored report", () => {
    const parsed = storedReportSchema.safeParse(SAMPLE_REPORT);
    expect(parsed.error?.issues ?? []).toEqual([]);
    expect(parsed.success).toBe(true);
  });

  it("carries the evidence a real report would", () => {
    expect(SAMPLE_REPORT.questions.length).toBeGreaterThan(0);
    // Favicons are the reason the payload is kept untrimmed — without them the
    // research library renders as a column of generic link glyphs.
    const resources = SAMPLE_REPORT.researchResources ?? [];
    expect(resources.length).toBeGreaterThan(0);
    expect(resources.some((r) => r.faviconUrl)).toBe(true);
    expect(SAMPLE_REPORT.questions.every((q) => q.prepNote)).toBe(true);
  });

  it("describes itself the way the sidebar row claims", () => {
    expect(SAMPLE_SUMMARY.id).toBe(SAMPLE_RESEARCH_ID);
    expect(SAMPLE_SUMMARY.companyName).toBe(SAMPLE_COMPANY);
    expect(SAMPLE_SUMMARY.status).toBe("done");
    // The row's subtitle is built by splitting this, so it has to match the
    // rounds the report actually contains.
    const rounds = new Set(SAMPLE_REPORT.questions.map((q) => q.category));
    expect(SAMPLE_SUMMARY.interviewType.split(",").sort()).toEqual([...rounds].sort());
  });

  it("is not a real research id", () => {
    // A UUID here would collide with the owner-scoped lookup in /prepare/[id].
    expect(SAMPLE_RESEARCH_ID).not.toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("matches the role and location the banner quotes", () => {
    // These constants are quoted directly in the sample banner
    // (app/(app)/prepare/[id]/page.tsx), separately from the report body, so
    // nothing catches them drifting apart except this.
    expect(SAMPLE_REPORT.researchContext?.roleContext).toBe(SAMPLE_ROLE);
    expect(SAMPLE_REPORT.researchContext?.location).toBe(SAMPLE_LOCATION);
    expect(SAMPLE_REPORT.researchContext?.companyName).toBe(SAMPLE_COMPANY);
  });
});
