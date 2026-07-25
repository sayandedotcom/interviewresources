import type { MetadataRoute } from "next";

import { siteConfig } from "@/site";

import { publicRoutes } from "@/lib/seo/routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  // `label` is breadcrumb copy, not a sitemap field — drop it before emitting.
  return Object.entries(publicRoutes).map(([path, { label: _label, ...entry }]) => ({
    url: new URL(path, siteConfig.url).toString(),
    lastModified,
    ...entry,
  }));
}
