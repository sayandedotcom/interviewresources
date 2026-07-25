import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { reports, researches } from "@/lib/db/schema";

import { type TestDb, createTestDb, resetDb, seedUser } from "./harness";

const dbPromise = createTestDb();
vi.mock("@/lib/db/index", async () => ({ db: await dbPromise }));

let db: TestDb;

beforeAll(async () => {
  db = await dbPromise;
});

afterEach(async () => {
  await resetDb(db);
});

/** A report payload complete enough to satisfy `storedReportSchema`. */
function payload(over: Record<string, unknown> = {}) {
  return {
    companySnapshot: "A payments company.",
    companyExplainer: "Stripe builds payments infrastructure for the internet.",
    likelyLoopStructure: "Screen, then a four-round onsite.",
    interviewerSummary: null,
    questions: [
      {
        category: "system_design",
        question: "How would you make a payment endpoint safe to retry?",
        confidence: "high",
        rationale: "Two candidate write-ups mention idempotency keys.",
        prepNote: "SECRET-PREP-NOTE",
        evidenceUrls: ["https://example.com/a"],
        basis: "evidence",
      },
    ],
    skillsRequired: [],
    prepPlan: ["SECRET-PREP-PLAN"],
    interviewExperiences: [],
    recruiterPitch: null,
    importantLinks: [{ title: "A", url: "https://example.com/a", why: "why" }],
    evidenceCoverage: "rich",
    ...over,
  };
}

async function seedReport(publish: { slug: string; at: Date } | null, companyName = "Stripe") {
  const userId = await seedUser(db);
  const [research] = await db
    .insert(researches)
    .values({ userId, companyName, interviewType: "dsa", status: "done" })
    .returning({ id: researches.id });

  await db.insert(reports).values({
    researchId: research.id,
    jsonPayload: payload(),
    publishedSlug: publish?.slug ?? null,
    publishedAt: publish?.at ?? null,
  });
}

describe("published company pages", () => {
  it("lists only published reports", async () => {
    const { listPublishedPages } = await import("@/lib/publishing/company-pages");

    await seedReport(null, "Unpublished Co");
    await seedReport({ slug: "stripe", at: new Date("2026-07-20") }, "Stripe");

    const pages = await listPublishedPages();

    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({ slug: "stripe", companyName: "Stripe" });
  });

  it("returns null for an unpublished or unknown slug", async () => {
    const { getPublishedPage } = await import("@/lib/publishing/company-pages");

    await seedReport(null, "Unpublished Co");

    expect(await getPublishedPage("unpublished-co")).toBeNull();
    expect(await getPublishedPage("never-existed")).toBeNull();
  });

  it("serves a published page with evidence but never the paid fields", async () => {
    const { getPublishedPage } = await import("@/lib/publishing/company-pages");

    await seedReport({ slug: "stripe", at: new Date("2026-07-20") }, "Stripe");
    const page = await getPublishedPage("stripe");

    expect(page).not.toBeNull();
    expect(page!.companyName).toBe("Stripe");
    expect(page!.report.questions[0].evidenceUrls).toEqual(["https://example.com/a"]);

    // The whole commercial boundary, asserted end-to-end against a real
    // database rather than only against the pure redaction function.
    const serialised = JSON.stringify(page);
    expect(serialised).not.toContain("SECRET-PREP-NOTE");
    expect(serialised).not.toContain("SECRET-PREP-PLAN");
  });
});
