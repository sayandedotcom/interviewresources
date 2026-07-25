import Link from "next/link";

import { siteConfig } from "@/site";

import { BreadcrumbJsonLd, JsonLd } from "@/components/json-ld";

import { MAX_RUN_CREDITS } from "@/lib/credits";
import { aboutPageJsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  path: "/about",
  title: "About",
  description:
    "A solo-built AI research agent that works out what a specific company is likely to ask you — and links the evidence behind every question it produces.",
});

export default function AboutPage() {
  const { founderNote } = siteConfig.copy;

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <BreadcrumbJsonLd path="/about" />
      <JsonLd data={aboutPageJsonLd} />

      <h1 className="font-display text-3xl font-bold tracking-tight">About {siteConfig.name}</h1>
      <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
        {siteConfig.name} is an AI research agent that works out what a specific company is likely
        to ask you — and shows you where every question came from.
      </p>

      <div className="mt-10 space-y-10">
        <section>
          <h2 className="font-display text-xl font-semibold">Who builds this</h2>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            {founderNote.name} — one person, not a company with a content team.{" "}
            {founderNote.paragraphs[0]}
          </p>
          <p className="text-muted-foreground mt-3 leading-relaxed">{founderNote.paragraphs[1]}</p>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            You can reach {founderNote.name.split(" ")[0]} directly on{" "}
            <a
              href={siteConfig.links.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline">
              X
            </a>
            , or read the code on{" "}
            <a
              href={siteConfig.links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline">
              GitHub
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">What counts as evidence</h2>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            This is the part that matters, so it is worth being precise about. A search result only
            counts as evidence if the page carries real content — a title echo or a navigation blurb
            does not qualify, and company overview or interviewer profile pages do not count at all,
            because they say nothing about how a place actually interviews.
          </p>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            Below three substantial sources, the agent stops and broadens its search rather than
            shipping you a thin report. Every question it does produce carries a confidence level
            and links to the pages behind it, so you can check the reasoning yourself instead of
            taking it on trust. Questions the agent inferred — from a company&rsquo;s funding stage,
            its founders&rsquo; backgrounds, or how comparable companies interview — ship tagged{" "}
            <em>Inferred</em> and capped below High confidence, so they are never presented as
            something they are not.
          </p>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            More on how to read a report is in the{" "}
            <Link href="/help" className="text-primary hover:underline">
              help centre
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">What it will not do</h2>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            The agent finds publicly visible pages through web search. It does not bypass logins,
            paywalls, robots controls, CAPTCHAs, or private profiles — LinkedIn included. When a
            result sits behind one of those, the link is kept so you can open it yourself, but it is
            never read and never counted as evidence. Interviewer names are only ever used as search
            seeds for public work such as talks and blog posts.
          </p>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            The{" "}
            <Link href="/security" className="text-primary hover:underline">
              security page
            </Link>{" "}
            covers how your data is handled, and the{" "}
            <Link href="/privacy-policy" className="text-primary hover:underline">
              privacy policy
            </Link>{" "}
            covers what is stored.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">How it is priced</h2>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            Credits, bought once, spent only when you run a report — no subscription, no monthly
            fee. A report is metered at what it genuinely cost to research: typically about 46
            credits, under $0.50, and never more than {MAX_RUN_CREDITS} for a single run. The full
            breakdown is on the{" "}
            <Link href="/pricing" className="text-primary hover:underline">
              pricing page
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Get in touch</h2>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            Questions, bug reports, and disagreements are all welcome at{" "}
            <a href={`mailto:${siteConfig.emails.hello}`} className="text-primary hover:underline">
              {siteConfig.emails.hello}
            </a>
            , or through the{" "}
            <Link href="/contact" className="text-primary hover:underline">
              contact page
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
