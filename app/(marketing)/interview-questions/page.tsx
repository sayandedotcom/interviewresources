import Link from "next/link";

import { siteConfig } from "@/site";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { BreadcrumbJsonLd } from "@/components/json-ld";
import { Section } from "@/components/sections/section";

import { listPublishedPages } from "@/lib/publishing/company-pages";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  path: "/interview-questions",
  title: "Interview Questions by Company",
  description:
    "Evidence-backed interview questions researched company by company. Every question links to the source it came from — engineering blogs, job posts, and first-hand interview reports.",
});

/** Published pages change only when a report is published, so cache for an hour
 * rather than hitting the database on every crawl of a marketing page. */
export const revalidate = 3600;

export default async function InterviewQuestionsIndexPage() {
  /**
   * Degrade to the empty state rather than throwing. This page is prerendered,
   * so an unreachable database — or a schema that has not caught up with the
   * code yet — would otherwise fail the whole build over a marketing route.
   */
  const pages = await listPublishedPages().catch((error) => {
    console.error("/interview-questions: could not list published pages", error);
    return [];
  });

  return (
    <main className="flex flex-1 flex-col">
      <BreadcrumbJsonLd path="/interview-questions" />
      <Header />

      <Section tone="plain" width="prose">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Interview questions by company
        </h1>
        <p className="font-display text-muted-foreground mt-4 text-lg leading-relaxed">
          {siteConfig.name} researches a company&rsquo;s stack, culture and real interview reports,
          then works out the questions you&rsquo;re most likely to face. These pages show a sample
          of that research — every question with the evidence it came from, so you can check it
          rather than take our word for it.
        </p>

        {pages.length === 0 ? (
          <div className="mt-12 rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              No company pages published yet. You can{" "}
              <Link href="/" className="text-primary hover:underline">
                research any company yourself
              </Link>{" "}
              in about three minutes.
            </p>
          </div>
        ) : (
          <ul className="mt-12 grid gap-3 sm:grid-cols-2">
            {pages.map((page) => (
              <li key={page.slug}>
                <Link
                  href={`/interview-questions/${page.slug}`}
                  className="silver-edge bg-background hover:bg-muted/40 flex min-h-11 items-center rounded-2xl px-5 py-4 transition-colors">
                  <span className="font-display font-semibold">{page.companyName}</span>
                  <span className="text-muted-foreground ml-auto text-sm">Questions →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="font-display text-muted-foreground mt-10 text-sm leading-relaxed">
          Company not listed? The agent researches any company on demand — see{" "}
          <Link href="/pricing" className="text-primary hover:underline">
            pricing
          </Link>{" "}
          or read{" "}
          <Link href="/about" className="text-primary hover:underline">
            what we count as evidence
          </Link>
          .
        </p>
      </Section>

      <Footer />
    </main>
  );
}
