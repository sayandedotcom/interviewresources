import Link from "next/link";

import { siteConfig } from "@/site";

import { BreadcrumbJsonLd, JsonLd } from "@/components/json-ld";

import { helpFaqJsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  path: "/help",
  title: "Help & Documentation",
  description:
    "How to run your first research report, read confidence levels, and use the evidence links behind every question — the Interview Resources help centre.",
});

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <BreadcrumbJsonLd path="/help" />
      <JsonLd data={helpFaqJsonLd} />

      <h1 className="font-display text-3xl font-bold tracking-tight">Help & Documentation</h1>
      <p className="text-muted-foreground mt-4">
        Find answers to common questions and learn how to get the most out of {siteConfig.name}.
      </p>

      <div className="mt-8 space-y-8">
        {siteConfig.copy.helpFaqs.map((group) => (
          <section key={group.section}>
            <h2 className="font-display text-xl font-semibold">{group.section}</h2>
            <div className="mt-4 space-y-4">
              {group.items.map((item) => (
                <div key={item.question} className="rounded-lg border p-4">
                  <h3 className="font-medium">{item.question}</h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section>
          <h2 className="font-display text-xl font-semibold">Still need help?</h2>
          <p className="text-muted-foreground mt-2">
            If you cannot find what you are looking for, email{" "}
            <a
              href={`mailto:${siteConfig.emails.support}`}
              className="text-primary hover:underline">
              {siteConfig.emails.support}
            </a>
            . For how the research itself works, see{" "}
            <Link href="/about" className="text-primary hover:underline">
              what counts as evidence
            </Link>
            ; for what a report costs, see{" "}
            <Link href="/pricing" className="text-primary hover:underline">
              pricing
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
