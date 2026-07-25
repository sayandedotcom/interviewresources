import type { MetadataRoute } from "next";

type SitemapEntry = {
  priority: number;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  /**
   * Breadcrumb name for the route (see components/breadcrumb-json-ld.tsx).
   * Kept here rather than in the component so a new page can't be added with a
   * sitemap entry but no crumb. `app/sitemap.ts` strips it before emitting.
   */
  label: string;
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
  "/": { priority: 1.0, changeFrequency: "weekly", label: "Home" },
  "/pricing": { priority: 0.9, changeFrequency: "monthly", label: "Pricing" },
  "/about": { priority: 0.6, changeFrequency: "monthly", label: "About" },
  "/blog": { priority: 0.6, changeFrequency: "weekly", label: "Blog" },
  "/help": { priority: 0.6, changeFrequency: "monthly", label: "Help" },
  /** `monthly`, not `weekly`: claim the cadence the page actually keeps. */
  "/changelog": { priority: 0.5, changeFrequency: "monthly", label: "Changelog" },
  "/contact": { priority: 0.5, changeFrequency: "yearly", label: "Contact" },
  "/privacy-policy": { priority: 0.3, changeFrequency: "yearly", label: "Privacy Policy" },
  "/terms-of-service": { priority: 0.3, changeFrequency: "yearly", label: "Terms of Service" },
  "/cookies": { priority: 0.3, changeFrequency: "yearly", label: "Cookie Policy" },
  "/security": { priority: 0.3, changeFrequency: "yearly", label: "Security" },
  "/licenses": { priority: 0.3, changeFrequency: "yearly", label: "Licenses" },
} as const satisfies Record<string, SitemapEntry>;

export type PublicRoute = keyof typeof publicRoutes;
