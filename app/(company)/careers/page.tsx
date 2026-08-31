import Link from "next/link";

import { ArrowRight, Globe, MapPin } from "lucide-react";

import { BreadcrumbJsonLd } from "@/components/json-ld";

import { roles } from "@/lib/careers/roles";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  path: "/careers",
  title: "Careers",
  description:
    "Open roles at Interview Resources. A small, remote, deliberately unglamorous team building evidence-graded interview research. Engineering and go-to-market.",
});

export default function CareersPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12 md:py-16">
      <BreadcrumbJsonLd path="/careers" />

      <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Careers</h1>
      <p className="text-muted-foreground font-display mt-4 text-base leading-relaxed">
        We build interview research that shows its sources. Every question in a report is graded by
        how well it is grounded, and the parts we cannot back up say so. That standard is easy to
        write down and hard to keep, which is most of what the work here is.
      </p>
      <p className="text-muted-foreground font-display mt-4 text-base leading-relaxed">
        The team is small and remote. You will own whole surfaces rather than tickets, you will talk
        to customers, and there is nobody between you and the thing you ship.
      </p>

      <h2 className="font-display mt-12 text-lg font-semibold tracking-tight">Open roles</h2>

      <ul className="mt-4 grid gap-4">
        {roles.map((role) => (
          <li key={role.slug}>
            <Link
              href={`/careers/${role.slug}`}
              className="group hover:border-primary/40 hover:bg-muted/40 block rounded-xl border p-6 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-display text-lg font-semibold tracking-tight">{role.title}</h3>
                <ArrowRight
                  className="text-muted-foreground group-hover:text-primary mt-1 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </div>
              <p className="text-muted-foreground font-display mt-2 text-sm leading-relaxed">
                {role.tagline}
              </p>
              <div className="text-muted-foreground font-display mt-4 flex flex-wrap items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {role.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" aria-hidden />
                  {role.type}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="bg-muted/40 mt-10 rounded-xl border p-6">
        <h2 className="font-display text-base font-semibold">Nothing here fits?</h2>
        <p className="text-muted-foreground font-display mt-2 text-sm leading-relaxed">
          Apply to the role closest to what you do and say so in your message. We would rather read
          a good application to the wrong opening than miss you entirely.
        </p>
      </div>
    </div>
  );
}
