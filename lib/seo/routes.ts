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
  /**
   * Date of the last *meaningful content* change, `YYYY-MM-DD`.
   *
   * Declared by hand rather than derived, for two reasons. `new Date()` at
   * build time — what this used to do — stamps every URL with the deploy
   * timestamp, so all twelve claim to change together every deploy; that is a
   * fake freshness signal and gets discounted. Git mtime is no better: adding a
   * shared component touches every page file without changing a word anyone
   * reads.
   *
   * Update it when the copy changes, not when the chrome does. On the legal
   * pages this must agree with the visible "Last updated" line — a sitemap that
   * contradicts the page is worse than one that says nothing.
   */
  lastModified: string;
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
  "/": { priority: 1.0, changeFrequency: "weekly", label: "Home", lastModified: "2026-07-25" },
  "/pricing": {
    priority: 0.9,
    changeFrequency: "monthly",
    label: "Pricing",
    lastModified: "2026-07-25",
  },
  "/about": {
    priority: 0.6,
    changeFrequency: "monthly",
    label: "About",
    lastModified: "2026-07-25",
  },
  "/interview-questions": {
    priority: 0.8,
    changeFrequency: "weekly",
    label: "Interview Questions",
    lastModified: "2026-07-25",
  },
  "/blog": { priority: 0.6, changeFrequency: "weekly", label: "Blog", lastModified: "2026-07-25" },
  "/help": { priority: 0.6, changeFrequency: "monthly", label: "Help", lastModified: "2026-07-25" },
  /** `monthly`, not `weekly`: claim the cadence the page actually keeps. */
  "/changelog": {
    priority: 0.5,
    changeFrequency: "monthly",
    label: "Changelog",
    lastModified: "2026-07-25",
  },
  "/contact": {
    priority: 0.5,
    changeFrequency: "yearly",
    label: "Contact",
    lastModified: "2026-07-25",
  },
  // The four dates below match each page's visible "Last updated" line.
  "/privacy-policy": {
    priority: 0.3,
    changeFrequency: "yearly",
    label: "Privacy Policy",
    lastModified: "2026-07-24",
  },
  "/terms-of-service": {
    priority: 0.3,
    changeFrequency: "yearly",
    label: "Terms of Service",
    lastModified: "2026-07-24",
  },
  "/cookies": {
    priority: 0.3,
    changeFrequency: "yearly",
    label: "Cookie Policy",
    lastModified: "2026-07-23",
  },
  "/security": {
    priority: 0.3,
    changeFrequency: "yearly",
    label: "Security",
    lastModified: "2026-07-24",
  },
  "/licenses": {
    priority: 0.3,
    changeFrequency: "yearly",
    label: "Licenses",
    lastModified: "2026-07-23",
  },
} as const satisfies Record<string, SitemapEntry>;

export type PublicRoute = keyof typeof publicRoutes;
