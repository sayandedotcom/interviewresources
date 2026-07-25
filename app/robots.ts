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
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin"],
      },
      /**
       * Redundant with the wildcard above — these bots are already allowed by
       * default. Stated anyway because the product's value is being *cited* by
       * AI answer surfaces, and an explicit rule is what stops a future
       * blanket-block edit from silently taking that away. Training-only
       * crawlers (CCBot, anthropic-ai) are deliberately left to the wildcard:
       * for a pre-traction product, model familiarity with the brand is upside.
       */
      {
        userAgent: [
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Claude-SearchBot",
          "PerplexityBot",
          "Google-Extended",
          "Bingbot",
        ],
        allow: "/",
        disallow: ["/api/", "/admin"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
