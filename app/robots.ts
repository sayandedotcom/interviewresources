import type { MetadataRoute } from "next";

import { siteConfig } from "@/site";

export default function robots(): MetadataRoute.Robots {
  return {
    /**
     * `/share/` is intentionally crawlable: those pages carry a `noindex` meta
     * tag, and a crawler blocked here would never fetch the page to read it —
     * leaving the URL eligible to appear bare in results. `noindex` de-indexes;
     * `disallow` only prevents fetching.
     */
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
