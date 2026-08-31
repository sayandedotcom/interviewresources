import Link from "next/link";
import { notFound } from "next/navigation";

import { siteConfig } from "@/site";
import { ArrowLeft, Globe, MapPin } from "lucide-react";

import { JsonLd } from "@/components/json-ld";

import { type Role, getRole, roles } from "@/lib/careers/roles";
import { buildMetadata } from "@/lib/seo/metadata";

import { ApplicationForm } from "@/features/careers/application-form";

export function generateStaticParams() {
  return roles.map((role) => ({ slug: role.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const role = getRole(slug);
  if (!role) return {};

  return buildMetadata({
    path: `/careers/${slug}`,
    title: role.title,
    description: role.tagline,
  });
}

/** schema.org/JobPosting, so the role can surface in Google's job results. */
function jobPostingJsonLd(role: Role) {
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: role.title,
    description: [...role.about, ...role.responsibilities].join(" "),
    employmentType: "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: siteConfig.name,
      sameAs: siteConfig.url,
    },
    jobLocationType: "TELECOMMUTE",
    applicantLocationRequirements: { "@type": "Country", name: "Worldwide" },
    directApply: true,
    url: `${siteConfig.url}/careers/${role.slug}`,
  };
}

/** A titled list block. Every JD section on the page is one of these. */
function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      <ul className="mt-4 grid gap-3">
        {items.map((item) => (
          <li
            key={item}
            className="text-muted-foreground font-display before:bg-primary/60 relative pl-5 text-sm leading-relaxed before:absolute before:top-[0.55rem] before:left-0 before:h-1.5 before:w-1.5 before:rounded-full">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function RolePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const role = getRole(slug);
  if (!role) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12 md:py-16">
      <JsonLd data={jobPostingJsonLd(role)} />

      <Link
        href="/careers"
        className="text-muted-foreground hover:text-foreground font-display inline-flex items-center gap-1.5 text-sm transition-colors">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All open roles
      </Link>

      <h1 className="font-display mt-6 text-3xl font-bold tracking-tight md:text-4xl">
        {role.title}
      </h1>

      <div className="text-muted-foreground font-display mt-4 flex flex-wrap items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4" aria-hidden />
          {role.location}
        </span>
        <span className="flex items-center gap-1.5">
          <Globe className="h-4 w-4" aria-hidden />
          {role.type}
        </span>
      </div>

      <ul className="mt-5 flex flex-wrap gap-2">
        {role.stack.map((item) => (
          <li
            key={item}
            className="bg-muted text-muted-foreground font-display rounded-full px-3 py-1 text-xs">
            {item}
          </li>
        ))}
      </ul>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold tracking-tight">About the role</h2>
        {role.about.map((paragraph) => (
          <p
            key={paragraph}
            className="text-muted-foreground font-display mt-4 text-sm leading-relaxed">
            {paragraph}
          </p>
        ))}
      </section>

      <ListSection title="What you will do" items={role.responsibilities} />
      <ListSection title="What we are looking for" items={role.requirements} />
      <ListSection title="Nice to have" items={role.niceToHave} />
      <ListSection title="How the process runs" items={role.process} />

      <section id="apply" className="mt-14 scroll-mt-20 border-t pt-10">
        <h2 className="font-display text-xl font-semibold tracking-tight">Apply</h2>
        <p className="text-muted-foreground font-display mt-3 text-sm leading-relaxed">
          No resume upload and no application portal. Write us something real. A short, specific
          message about what you have built beats three pages of adjectives every time.
        </p>

        <div className="mt-8">
          <ApplicationForm roleSlug={role.slug} roleTitle={role.title} />
        </div>
      </section>
    </div>
  );
}
