/**
 * Server-only: reads the database directly. Import from server components and
 * route handlers, never from a `"use client"` module.
 */
import { and, desc, eq, isNotNull } from "drizzle-orm";

import { db } from "@/lib/db/index";
import { reports, researches } from "@/lib/db/schema";
import { storedReportSchema } from "@/lib/research/types";

import { type PublicReport, toPublicReport } from "./public-report";

export type PublishedPageSummary = {
  slug: string;
  companyName: string;
  publishedAt: Date;
};

export type PublishedPage = PublishedPageSummary & {
  report: PublicReport;
};

/**
 * Turns a company name into a URL slug.
 *
 * Deliberately lossy and ASCII-only: these paths end up in search results, get
 * pasted into chat, and are compared by hand. `Basis Theory` and `basis-theory`
 * should be one page, not two.
 */
export function companySlug(companyName: string): string {
  return companyName
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Every published page, newest first. Drives the index page and the sitemap. */
export async function listPublishedPages(): Promise<PublishedPageSummary[]> {
  const rows = await db
    .select({
      slug: reports.publishedSlug,
      companyName: researches.companyName,
      publishedAt: reports.publishedAt,
    })
    .from(reports)
    .innerJoin(researches, eq(reports.researchId, researches.id))
    .where(and(isNotNull(reports.publishedSlug), isNotNull(reports.publishedAt)))
    .orderBy(desc(reports.publishedAt));

  // The `isNotNull` filters already guarantee these, but the column types stay
  // nullable — narrow here rather than asserting at every call site.
  return rows.flatMap((r) =>
    r.slug && r.publishedAt
      ? [{ slug: r.slug, companyName: r.companyName, publishedAt: r.publishedAt }]
      : []
  );
}

/**
 * One published page, or null if the slug is unknown or unpublished.
 *
 * Returns the *redacted* report — `toPublicReport` is applied here rather than
 * in the page component so there is no route through this module that hands a
 * caller the full paid payload.
 */
export async function getPublishedPage(slug: string): Promise<PublishedPage | null> {
  const [row] = await db
    .select({
      slug: reports.publishedSlug,
      publishedAt: reports.publishedAt,
      payload: reports.jsonPayload,
      companyName: researches.companyName,
    })
    .from(reports)
    .innerJoin(researches, eq(reports.researchId, researches.id))
    .where(and(eq(reports.publishedSlug, slug), isNotNull(reports.publishedAt)))
    .limit(1);

  if (!row?.slug || !row.publishedAt) return null;

  // Reports predate several schema additions, so parse rather than cast: a row
  // that no longer fits the schema should 404, not throw in the renderer.
  const parsed = storedReportSchema.safeParse(row.payload);
  if (!parsed.success) return null;

  return {
    slug: row.slug,
    companyName: row.companyName,
    publishedAt: row.publishedAt,
    report: toPublicReport(parsed.data),
  };
}
