import Link from "next/link";
import { notFound } from "next/navigation";

import { siteConfig } from "@/site";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { JsonLd } from "@/components/json-ld";
import { Section } from "@/components/sections/section";

import {
  type PublishedPage,
  getPublishedPage,
  listPublishedPages,
} from "@/lib/publishing/company-pages";
import { companyBreadcrumbJsonLd, companyPageJsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600;

/** Prerender what exists at build time; anything published later renders on
 * demand and is then cached, rather than 404ing until the next deploy. */
export async function generateStaticParams() {
  const pages = await listPublishedPages().catch(() => []);
  return pages.map((page) => ({ slug: page.slug }));
}

function headlineFor(companyName: string) {
  return `${companyName} Interview Questions, Backed by Evidence`;
}

function descriptionFor(page: PublishedPage) {
  const evidenceCount = page.report.questions.filter((q) => q.basis === "evidence").length;
  return (
    `Interview questions researched for ${page.companyName}, each linked to the source it ` +
    `came from — ${evidenceCount} of the ${page.report.questions.length} shown here are backed ` +
    `by first-hand evidence rather than inference.`
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) return {};

  return buildMetadata({
    path: `/interview-questions/${slug}`,
    title: `${page.companyName} Interview Questions`,
    description: descriptionFor(page),
  });
}

const confidenceLabel = { high: "High confidence", medium: "Medium confidence", low: "Low" };

export default async function CompanyQuestionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) notFound();

  const { report } = page;
  const withheld = report.totalQuestions - report.questions.length;

  return (
    <main className="flex flex-1 flex-col">
      <JsonLd
        data={[
          companyBreadcrumbJsonLd(slug, page.companyName),
          companyPageJsonLd({
            slug,
            companyName: page.companyName,
            publishedAt: page.publishedAt,
            headline: headlineFor(page.companyName),
            description: descriptionFor(page),
          }),
        ]}
      />
      <Header />

      <Section tone="plain" width="prose">
        <p className="font-display text-muted-foreground text-sm">
          <Link href="/interview-questions" className="hover:text-foreground">
            Interview questions
          </Link>{" "}
          / {page.companyName}
        </p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          {headlineFor(page.companyName)}
        </h1>

        {report.companyExplainer && (
          <p className="font-display text-muted-foreground mt-6 text-lg leading-relaxed">
            {report.companyExplainer}
          </p>
        )}

        {/* Stated up front, not buried: a reader deciding whether to trust the
            page should not have to infer how much evidence sits behind it. */}
        <div className="silver-edge bg-background mt-8 rounded-2xl p-6">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            How this page was researched
          </h2>
          <p className="font-display text-muted-foreground mt-2 leading-relaxed">
            An AI agent searched public sources for how {page.companyName} actually interviews —
            engineering blogs, job posts, and first-hand accounts from people who interviewed there.
            A result only counts as evidence if the page carries real content; logins, paywalls and
            robots-controlled pages are never read.{" "}
            {report.evidenceCoverage === "sparse"
              ? `Public interview data on ${page.companyName} was thin, so some questions below are inferred from comparable companies and labelled as such.`
              : `Questions labelled Inferred are derived from proxy signals rather than direct accounts.`}{" "}
            Read more about{" "}
            <Link href="/about" className="text-primary hover:underline">
              what counts as evidence
            </Link>
            .
          </p>
        </div>

        {report.likelyLoopStructure && (
          <>
            <h2 className="font-display mt-12 text-2xl font-semibold tracking-tight">
              The {page.companyName} interview process
            </h2>
            <p className="font-display text-muted-foreground mt-3 leading-relaxed">
              {report.likelyLoopStructure}
            </p>
          </>
        )}

        <h2 className="font-display mt-12 text-2xl font-semibold tracking-tight">
          Questions you&rsquo;re likely to face
        </h2>
        <ul className="mt-6 space-y-5">
          {report.questions.map((q) => (
            <li key={q.question} className="silver-edge bg-background rounded-2xl p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs font-medium">
                  {q.category}
                </span>
                <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-medium">
                  {confidenceLabel[q.confidence]}
                </span>
                {q.basis !== "evidence" && (
                  <span className="border-border text-muted-foreground rounded-full border px-2.5 py-1 text-xs font-medium">
                    {q.basis === "inferred" ? "Inferred" : "Role-standard"}
                  </span>
                )}
              </div>
              <p className="font-display mt-3 text-lg font-semibold tracking-tight">{q.question}</p>
              <p className="font-display text-muted-foreground mt-2 leading-relaxed">
                {q.rationale}
              </p>
              {q.evidenceUrls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  {q.evidenceUrls.map((url, i) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-primary inline-flex min-h-11 items-center text-sm hover:underline">
                      Source {i + 1} ↗
                    </a>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>

        {/* The conversion boundary. Honest about exactly what is being withheld
            and why, rather than a vague "unlock more". */}
        <div className="border-primary/30 bg-primary/5 mt-10 rounded-2xl border p-6">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            What this page leaves out
          </h2>
          <p className="font-display text-muted-foreground mt-2 leading-relaxed">
            {withheld > 0
              ? `This page shows ${report.questions.length} of ${report.totalQuestions} questions from the full report.`
              : `This page shows the ${report.questions.length} strongest questions from the research.`}{" "}
            It deliberately omits the prep notes — what a strong answer actually covers — plus the
            ordered prep plan, the skills the role really demands, and the recruiter-facing
            positioning. Running the research yourself for your own role, stack and rounds costs
            under $0.50.
          </p>
          <Link
            href="/signin"
            className="font-display text-brand-700 mt-5 inline-flex min-h-11 items-center rounded-full bg-[image:var(--gradient-glossy-white)] px-6 text-sm font-semibold shadow-[var(--shadow-glossy-white)] transition-all hover:bg-[image:var(--gradient-glossy-white-hover)]">
            {siteConfig.cta.signedOutLabel}
          </Link>
        </div>

        {report.importantLinks.length > 0 && (
          <>
            <h2 className="font-display mt-12 text-2xl font-semibold tracking-tight">
              Worth reading
            </h2>
            <ul className="mt-4 space-y-3">
              {report.importantLinks.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="font-display text-primary font-medium hover:underline">
                    {link.title} ↗
                  </a>
                  <p className="text-muted-foreground text-sm">{link.why}</p>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="font-display text-muted-foreground mt-12 text-sm leading-relaxed">
          Researched by {siteConfig.name} and published on{" "}
          {page.publishedAt.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          . Questions are predictions from public evidence, not a leaked question bank — see{" "}
          <Link href="/interview-questions" className="text-primary hover:underline">
            all companies
          </Link>
          .
        </p>
      </Section>

      <Footer />
    </main>
  );
}
