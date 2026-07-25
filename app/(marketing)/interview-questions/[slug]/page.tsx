import Link from "next/link";
import { notFound } from "next/navigation";

import { siteConfig } from "@/site";
import { ArrowRight, ArrowUpRight, Check, ChevronRight } from "lucide-react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { HeroBand, StatRow, StatTile } from "@/components/interview-questions/hero";
import { PageRail, type RailSection } from "@/components/interview-questions/page-rail";
import { QuestionList } from "@/components/interview-questions/question-list";
import { JsonLd } from "@/components/json-ld";
import { Section } from "@/components/sections/section";

import {
  type PublishedPage,
  getPublishedPage,
  listPublishedPages,
} from "@/lib/publishing/company-pages";
import { hostLabel } from "@/lib/research/display";
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

/** What the published page deliberately holds back. Mirrors `toPublicReport`. */
const WITHHELD = [
  "Prep notes — what a strong answer actually covers",
  "The ordered prep plan for your remaining time",
  "The skills the role really demands, including what the posting leaves unsaid",
  "Recruiter-facing positioning: who they hire, and how to read as that person",
];

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  // scroll-mt clears the heading of the viewport top when the rail jumps to it.
  return (
    <h2
      id={id}
      className="font-display scroll-mt-24 text-2xl font-semibold tracking-tight sm:text-3xl">
      {children}
    </h2>
  );
}

function LinkCard({ title, url, why }: { title: string; url: string; why: string }) {
  return (
    <li>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="silver-edge bg-background ease-out-strong group block rounded-2xl p-5 shadow-[var(--shadow-xs)] transition-[box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
        <span className="flex items-start gap-2">
          <span className="font-display group-hover:text-primary font-medium transition-colors">
            {title}
          </span>
          <ArrowUpRight
            aria-hidden
            className="text-muted-foreground group-hover:text-primary mt-1 h-4 w-4 shrink-0 transition-colors"
          />
        </span>
        <span className="font-display text-muted-foreground mt-1.5 block text-sm leading-relaxed">
          {why}
        </span>
        <span className="text-muted-foreground mt-2 block text-xs">{hostLabel(url)}</span>
      </a>
    </li>
  );
}

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
  const evidenceCount = report.questions.filter((q) => q.basis === "evidence").length;
  const sourceCount = new Set(report.questions.flatMap((q) => q.evidenceUrls)).size;
  const publishedOn = page.publishedAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Built from what the report actually carries, so the rail can never link to
  // a section this particular run never produced.
  const railSections: RailSection[] = [
    ...(report.companySnapshot ? [{ id: "company", label: `About ${page.companyName}` }] : []),
    ...(report.likelyLoopStructure ? [{ id: "process", label: "The interview process" }] : []),
    { id: "questions", label: "Likely questions" },
    ...(report.interviewExperiences.length > 0
      ? [{ id: "experiences", label: "Interview experiences" }]
      : []),
    ...(report.importantLinks.length > 0 ? [{ id: "reading", label: "Worth reading" }] : []),
  ];

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

      <HeroBand>
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-sm text-white/70">
            <li>
              <Link href="/interview-questions" className="transition-colors hover:text-white">
                Interview questions
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            <li aria-current="page" className="text-white">
              {page.companyName}
            </li>
          </ol>
        </nav>

        <h1 className="font-display mt-5 max-w-3xl text-4xl leading-[1.1] font-semibold tracking-tight text-white sm:text-5xl">
          {headlineFor(page.companyName)}
        </h1>

        {report.companyExplainer && (
          <p className="font-display mt-5 max-w-2xl text-lg leading-relaxed text-white/85">
            {report.companyExplainer}
          </p>
        )}

        {/* Stated up front, not buried: a reader deciding whether to trust the
            page should not have to infer how much evidence sits behind it. */}
        <StatRow>
          <StatTile
            value={
              withheld > 0
                ? `${report.questions.length} of ${report.totalQuestions}`
                : String(report.questions.length)
            }
            label="questions shown from the full report"
          />
          <StatTile
            value={String(evidenceCount)}
            label="backed by first-hand evidence, not inference"
          />
          <StatTile value={String(sourceCount)} label="sources cited and linked below" />
        </StatRow>
      </HeroBand>

      <Section tone="plain" innerClassName="pt-2 pb-16 md:pt-4 md:pb-20">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-14">
          <div className="max-w-3xl min-w-0 space-y-14">
            {/* A disclosure, not a wall: the methodology has to be on the page
                and crawlable, but it should not be the first thing between a
                reader and the questions they came for. */}
            <details className="silver-edge bg-background group rounded-2xl px-6 py-5 shadow-[var(--shadow-xs)]">
              <summary className="font-display flex cursor-pointer list-none items-center gap-3 text-base font-semibold tracking-tight">
                How this page was researched
                <ChevronRight
                  aria-hidden
                  className="text-muted-foreground ml-auto h-4 w-4 transition-transform duration-200 group-open:rotate-90"
                />
              </summary>
              <p className="font-display text-muted-foreground mt-4 leading-relaxed">
                An AI agent searched public sources for how {page.companyName} actually interviews —
                engineering blogs, job posts, and first-hand accounts from people who interviewed
                there. A result only counts as evidence if the page carries real content; logins,
                paywalls and robots-controlled pages are never read.{" "}
                {report.evidenceCoverage === "sparse"
                  ? `Public interview data on ${page.companyName} was thin, so some questions below are inferred from comparable companies and labelled as such.`
                  : `Questions labelled Inferred are derived from proxy signals rather than direct accounts.`}{" "}
                Read more about{" "}
                <Link href="/about" className="text-primary hover:underline">
                  what counts as evidence
                </Link>
                .
              </p>
            </details>

            {report.companySnapshot && (
              <section>
                <SectionHeading id="company">About {page.companyName}</SectionHeading>
                <p className="font-display text-muted-foreground mt-4 leading-relaxed">
                  {report.companySnapshot}
                </p>
              </section>
            )}

            {report.likelyLoopStructure && (
              <section>
                <SectionHeading id="process">
                  The {page.companyName} interview process
                </SectionHeading>
                <p className="font-display text-muted-foreground mt-4 leading-relaxed">
                  {report.likelyLoopStructure}
                </p>
              </section>
            )}

            <section>
              <SectionHeading id="questions">Questions you’re likely to face</SectionHeading>
              <p className="font-display text-muted-foreground mt-3 mb-6 leading-relaxed">
                Each question carries the confidence we place in it and links to the source it came
                from, so you can check the reasoning rather than trust it.
              </p>
              <QuestionList questions={report.questions} />
            </section>

            {report.interviewExperiences.length > 0 && (
              <section>
                <SectionHeading id="experiences">Interview experiences</SectionHeading>
                <p className="font-display text-muted-foreground mt-3 leading-relaxed">
                  First-hand write-ups from people who interviewed at {page.companyName}. These are
                  the accounts the questions above were predicted from.
                </p>
                <ul className="mt-6 space-y-3">
                  {report.interviewExperiences.map((experience) => (
                    <LinkCard key={experience.url} {...experience} />
                  ))}
                </ul>
              </section>
            )}

            {report.importantLinks.length > 0 && (
              <section>
                <SectionHeading id="reading">Worth reading</SectionHeading>
                <ul className="mt-6 space-y-3">
                  {report.importantLinks.map((link) => (
                    <LinkCard key={link.url} {...link} />
                  ))}
                </ul>
              </section>
            )}
          </div>

          <PageRail
            sections={railSections}
            ctaHref="/signin"
            ctaLabel={siteConfig.cta.signedOutLabel}
            ctaNote={`This page is a sample. Run the research for your own role, stack and rounds at ${page.companyName} for under $0.50.`}
          />
        </div>
      </Section>

      {/* The conversion boundary. Honest about exactly what is being withheld
          and why, rather than a vague "unlock more". */}
      <Section tone="wash" innerClassName="py-16 md:py-20">
        <div className="silver-edge bg-background mx-auto max-w-3xl rounded-2xl p-8 shadow-[var(--shadow-xs)] sm:p-10">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            What this page leaves out
          </h2>
          <p className="font-display text-muted-foreground mt-4 leading-relaxed">
            {withheld > 0
              ? `This page shows ${report.questions.length} of ${report.totalQuestions} questions from the full report.`
              : `This page shows the ${report.questions.length} strongest questions from the research.`}{" "}
            It deliberately omits everything that helps you actually pass:
          </p>
          <ul className="mt-6 space-y-3">
            {WITHHELD.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="bg-brand-50 text-brand-700 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                  <Check className="h-3 w-3" />
                </span>
                <span className="font-display text-muted-foreground leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
          <p className="font-display text-muted-foreground mt-6 leading-relaxed">
            Running the research yourself, for your own role, stack and rounds, costs under $0.50.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/signin"
              className="font-display ease-out-strong inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-[image:var(--gradient-glossy)] px-6 text-sm font-semibold text-white shadow-[var(--shadow-glossy)] transition-[box-shadow,translate,scale] duration-150 hover:bg-[image:var(--gradient-glossy-hover)] hover:shadow-[var(--shadow-glossy-hover)] active:translate-y-px active:scale-[0.98] active:shadow-[var(--shadow-glossy-active)]">
              {siteConfig.cta.signedOutLabel}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="font-display text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center justify-center px-4 text-sm font-medium transition-colors">
              See pricing
            </Link>
          </div>
        </div>

        <p className="font-display text-muted-foreground mx-auto mt-10 max-w-3xl text-sm leading-relaxed">
          Researched by {siteConfig.name} and published on {publishedOn}. Questions are predictions
          from public evidence, not a leaked question bank — see{" "}
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
