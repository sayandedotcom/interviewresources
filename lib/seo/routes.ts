import type { MetadataRoute } from "next";

type SitemapEntry = {
  priority: number;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
};

/**
 * Every public, indexable route on the site — the single source of truth for
 * both canonical URLs (via `buildMetadata` in ./metadata.ts) and the sitemap
 * (app/sitemap.ts). Adding a page means adding it here, or `buildMetadata`
 * won't typecheck for it.
 *
 * `/signin` is deliberately absent: it's publicly reachable but has no search
 * value and would only compete with the landing page for the brand query.
 * Gated routes are absent for the same reason they carry `noIndexMetadata`.
 */
export const publicRoutes = {
  "/": { priority: 1.0, changeFrequency: "weekly" },
  "/pricing": { priority: 0.9, changeFrequency: "monthly" },
  "/about": { priority: 0.6, changeFrequency: "monthly" },
  "/blog": { priority: 0.6, changeFrequency: "weekly" },
  "/help": { priority: 0.6, changeFrequency: "monthly" },
  "/changelog": { priority: 0.5, changeFrequency: "weekly" },
  "/contact": { priority: 0.5, changeFrequency: "yearly" },
  "/privacy-policy": { priority: 0.3, changeFrequency: "yearly" },
  "/terms-of-service": { priority: 0.3, changeFrequency: "yearly" },
  "/cookies": { priority: 0.3, changeFrequency: "yearly" },
  "/security": { priority: 0.3, changeFrequency: "yearly" },
  "/licenses": { priority: 0.3, changeFrequency: "yearly" },
} as const satisfies Record<string, SitemapEntry>;

export type PublicRoute = keyof typeof publicRoutes;
