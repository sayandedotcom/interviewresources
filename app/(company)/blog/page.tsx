import { siteConfig } from "@/site";

import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  path: "/blog",
  title: "Blog",
  description: `${siteConfig.name} Blog - Interview tips and insights`,
});

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight">Blog</h1>
      <p className="text-muted-foreground mt-4">
        Insights, tips, and best practices for interview preparation.
      </p>

      <div className="mt-12 rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          Nothing published yet. Check back soon — or follow along on{" "}
          <a
            href={siteConfig.links.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline">
            X
          </a>
          .
        </p>
      </div>
    </div>
  );
}
