import Link from "next/link";

import { siteConfig } from "@/site";
import { ArrowRight, FileSearch } from "lucide-react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { CompanyCard } from "@/components/interview-questions/company-card";
import { HeroBand, HeroEyebrow, StatRow, StatTile } from "@/components/interview-questions/hero";
import { BreadcrumbJsonLd } from "@/components/json-ld";
import { Section } from "@/components/sections/section";

import { listPublishedPageCards } from "@/lib/publishing/company-pages";
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
  const pages = await listPublishedPageCards().catch((error) => {
    console.error("/interview-questions: could not list published pages", error);
    return [];
  });

  const totalQuestions = pages.reduce((sum, page) => sum + page.questionCount, 0);
  const totalEvidenced = pages.reduce((sum, page) => sum + page.evidenceCount, 0);

  return (
    <main className="flex flex-1 flex-col">
      <BreadcrumbJsonLd path="/interview-questions" />
      <Header />

      <HeroBand>
        <HeroEyebrow>Directory</HeroEyebrow>
        <h1 className="font-display mt-4 max-w-3xl text-4xl leading-[1.1] font-semibold tracking-tight text-white sm:text-5xl">
          Interview questions by company
        </h1>
        {/* Curly quotes are written as literal characters, not `&rsquo;`: SWC
            drops the leading whitespace of any JSXText node containing an HTML
            entity, which glued this sentence to the site name. */}
        <p className="font-display mt-5 max-w-2xl text-lg leading-relaxed text-white/85">
          {siteConfig.name} researches a company’s stack, culture and real interview reports, then
          works out the questions you’re most likely to face. These pages show a sample of that
          research — every question with the evidence it came from, so you can check it rather than
          take our word for it.
        </p>

        {pages.length > 0 && (
          <StatRow>
            <StatTile
              value={String(pages.length)}
              label={pages.length === 1 ? "company researched" : "companies researched"}
            />
            <StatTile value={String(totalQuestions)} label="questions published" />
            <StatTile
              value={String(totalEvidenced)}
              label="backed by first-hand evidence, not inference"
            />
          </StatRow>
        )}
      </HeroBand>

      <Section tone="plain" innerClassName="pt-2 pb-16 md:pt-4 md:pb-20">
        {pages.length === 0 ? (
          <div className="silver-edge bg-background mx-auto max-w-xl rounded-2xl p-10 text-center shadow-[var(--shadow-xs)]">
            <FileSearch aria-hidden className="text-primary mx-auto h-8 w-8" />
            <h2 className="font-display mt-5 text-xl font-semibold tracking-tight">
              No company pages published yet
            </h2>
            <p className="font-display text-muted-foreground mt-3 leading-relaxed">
              The agent researches any company on demand — it takes about three minutes and costs
              under $0.50.
            </p>
            <Link
              href="/"
              className="font-display ease-out-strong mt-6 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[image:var(--gradient-glossy)] px-6 text-sm font-semibold text-white shadow-[var(--shadow-glossy)] transition-[box-shadow,translate,scale] duration-150 hover:bg-[image:var(--gradient-glossy-hover)] hover:shadow-[var(--shadow-glossy-hover)] active:translate-y-px active:scale-[0.98] active:shadow-[var(--shadow-glossy-active)]">
              Research a company
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((page) => (
              <li key={page.slug}>
                <CompanyCard page={page} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {pages.length > 0 && (
        <Section tone="wash" innerClassName="py-16 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Company not listed?
            </h2>
            <p className="font-display text-muted-foreground mt-4 leading-relaxed">
              The agent researches any company on demand, for your role, your stack and the rounds
              you’re actually facing — not the sample these pages show.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/"
                className="font-display ease-out-strong inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[image:var(--gradient-glossy)] px-6 text-sm font-semibold text-white shadow-[var(--shadow-glossy)] transition-[box-shadow,translate,scale] duration-150 hover:bg-[image:var(--gradient-glossy-hover)] hover:shadow-[var(--shadow-glossy-hover)] active:translate-y-px active:scale-[0.98] active:shadow-[var(--shadow-glossy-active)]">
                Research a company
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="font-display text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center px-4 text-sm font-medium transition-colors">
                See pricing
              </Link>
            </div>
            <p className="font-display text-muted-foreground mt-8 text-sm leading-relaxed">
              Or read{" "}
              <Link href="/about" className="text-primary hover:underline">
                what we count as evidence
              </Link>
              .
            </p>
          </div>
        </Section>
      )}

      <Footer />
    </main>
  );
}
