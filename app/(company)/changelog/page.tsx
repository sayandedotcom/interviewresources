import { siteConfig } from "@/site";

import { BreadcrumbJsonLd } from "@/components/json-ld";

import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  path: "/changelog",
  title: "Changelog",
  description:
    "What's shipped in Interview Resources: research pipeline changes, confidence-scoring updates, and pricing changes, dated by release.",
});

export default function ChangelogPage() {
  const { changelog } = siteConfig.copy;

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <BreadcrumbJsonLd path="/changelog" />
      <h1 className="font-display text-3xl font-bold tracking-tight">Changelog</h1>
      <p className="text-muted-foreground mt-4">
        User-visible changes to {siteConfig.name}, newest first. Refactors and dependency bumps live
        in the git history, not here.
      </p>

      {changelog.length === 0 ? (
        <div className="mt-12 rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">Nothing to report yet.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {changelog.map((release) => (
            <div key={release.date} className="relative">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-3 py-1 text-sm font-medium">
                  {release.date}
                </span>
                <span className="font-display font-semibold">{release.title}</span>
              </div>
              <ul className="mt-4 space-y-2">
                {release.changes.map((change) => (
                  <li key={change} className="text-muted-foreground flex items-start gap-2">
                    <span className="bg-primary mt-2 h-1.5 w-1.5 shrink-0 rounded-full" />
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
