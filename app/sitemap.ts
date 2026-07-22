import type { MetadataRoute } from "next";

import { siteConfig } from "@/site";

import { publicRoutes } from "@/lib/seo/routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return Object.entries(publicRoutes).map(([path, entry]) => ({
    url: new URL(path, siteConfig.url).toString(),
    lastModified,
    ...entry,
  }));
}
