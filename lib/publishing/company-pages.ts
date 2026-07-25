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
 * A summary plus the handful of counts the directory card shows. Derived from
 * the redacted report, never the raw payload, so the index cannot leak a field
 * the detail page withholds.
 */
export type PublishedPageCard = PublishedPageSummary & {
  /** First sentence of the snapshot or explainer — one line of "why this company". */
  blurb: string | null;
  questionCount: number;
  evidenceCount: number;
  sourceCount: number;
  /** Distinct question categories, in the order the questions appear. */
  categories: string[];
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
 * The first sentence of a paragraph, capped so a card stays one or two lines.
 *
 * Deliberately naive: these are model-written marketing paragraphs, not prose
 * with abbreviations, so splitting on ". " is right far more often than a
 * sentence segmenter would be worth.
 */
function firstSentence(text: string | null, max = 140): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;

  const end = trimmed.search(/\.\s/);
  const sentence = end === -1 ? trimmed : trimmed.slice(0, end + 1);
  return sentence.length > max ? `${sentence.slice(0, max).trimEnd()}…` : sentence;
}

/**
 * Every published page with the counts the directory cards show.
 *
 * Reads each report payload, which `listPublishedPages` deliberately does not —
 * the sitemap wants slugs and nothing else. Only the index page calls this, and
 * only behind an hour of ISR, so the extra payload read is paid once an hour
 * across a set of pages that is published by hand.
 */
export async function listPublishedPageCards(): Promise<PublishedPageCard[]> {
  const rows = await db
    .select({
      slug: reports.publishedSlug,
      companyName: researches.companyName,
      publishedAt: reports.publishedAt,
      payload: reports.jsonPayload,
    })
    .from(reports)
    .innerJoin(researches, eq(reports.researchId, researches.id))
    .where(and(isNotNull(reports.publishedSlug), isNotNull(reports.publishedAt)))
    .orderBy(desc(reports.publishedAt));

  return rows.flatMap((row) => {
    if (!row.slug || !row.publishedAt) return [];

    // A row whose payload no longer fits the schema 404s on the detail page, so
    // listing it here would only produce a card that leads to a dead end.
    const parsed = storedReportSchema.safeParse(row.payload);
    if (!parsed.success) return [];

    const report = toPublicReport(parsed.data);
    const sources = new Set(report.questions.flatMap((q) => q.evidenceUrls));

    return [
      {
        slug: row.slug,
        companyName: row.companyName,
        publishedAt: row.publishedAt,
        blurb: firstSentence(report.companySnapshot ?? report.companyExplainer),
        questionCount: report.questions.length,
        evidenceCount: report.questions.filter((q) => q.basis === "evidence").length,
        sourceCount: sources.size,
        categories: [...new Set(report.questions.map((q) => q.category))],
      },
    ];
  });
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
