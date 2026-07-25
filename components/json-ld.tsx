import { breadcrumbJsonLd } from "@/lib/seo/json-ld";
import type { PublicRoute } from "@/lib/seo/routes";

/**
 * Emits JSON-LD server-side. Deliberately a server component: injecting
 * structured data from the client works, but it depends on the crawler
 * rendering JavaScript before it sees the markup, which is a weaker guarantee
 * than shipping it in the HTML.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

/** Home > {page}. Names come from the public-route registry. */
export function BreadcrumbJsonLd({ path }: { path: Exclude<PublicRoute, "/"> }) {
  return <JsonLd data={breadcrumbJsonLd(path)} />;
}
