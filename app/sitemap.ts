import type { MetadataRoute } from "next";

import { siteConfig } from "@/site";

import { listPublishedPages } from "@/lib/publishing/company-pages";
import { publicRoutes } from "@/lib/seo/routes";

/**
 * Matches the company pages' own `revalidate`. Without it the sitemap is built
 * once at deploy and never sees a report published afterwards — the page would
 * be live and crawlable within the hour while the sitemap still denied it
 * existed, until someone happened to deploy.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // `label` is breadcrumb copy, not a sitemap field — drop it before emitting.
  // `lastModified` is per-route and declared in the registry: a single
  // build-time `new Date()` would tell crawlers all twelve pages changed on
  // every deploy, which is exactly the signal Google learns to ignore.
  const staticRoutes = Object.entries(publicRoutes).map(
    ([path, { label: _label, lastModified, ...entry }]) => ({
      url: new URL(path, siteConfig.url).toString(),
      lastModified: new Date(lastModified),
      ...entry,
    })
  );

  /**
   * Published company pages carry a real `lastModified` for free: it is the
   * moment the report was published, not a build timestamp.
   *
   * A database failure here must not take the sitemap down — an empty company
   * section costs some discovery, a 500 costs the whole file.
   */
  let companyRoutes: MetadataRoute.Sitemap = [];
  try {
    const published = await listPublishedPages();
    companyRoutes = published.map((page) => ({
      url: new URL(`/interview-questions/${page.slug}`, siteConfig.url).toString(),
      lastModified: page.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  } catch (error) {
    console.error("sitemap: could not list published company pages", error);
  }

  return [...staticRoutes, ...companyRoutes];
}
