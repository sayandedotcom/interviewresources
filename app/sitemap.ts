import type { MetadataRoute } from "next";

import { siteConfig } from "@/site";

import { publicRoutes } from "@/lib/seo/routes";

export default function sitemap(): MetadataRoute.Sitemap {
  // `label` is breadcrumb copy, not a sitemap field — drop it before emitting.
  // `lastModified` is per-route and declared in the registry: a single
  // build-time `new Date()` would tell crawlers all twelve pages changed on
  // every deploy, which is exactly the signal Google learns to ignore.
  return Object.entries(publicRoutes).map(([path, { label: _label, lastModified, ...entry }]) => ({
    url: new URL(path, siteConfig.url).toString(),
    lastModified: new Date(lastModified),
    ...entry,
  }));
}
