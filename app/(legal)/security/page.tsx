import { siteConfig } from "@/site";

import { BreadcrumbJsonLd } from "@/components/json-ld";

import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  path: "/security",
  title: "Security",
  description: `Security policy for ${siteConfig.name}`,
});

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <BreadcrumbJsonLd path="/security" />
      <h1 className="font-display text-3xl font-bold tracking-tight">Security</h1>
      <p className="text-muted-foreground mt-4">
        Last updated: July 24, 2026. This page describes controls implemented in the product today,
        without claiming certifications or controls we have not independently verified.
      </p>

      <div className="mt-8 space-y-6">
        <section>
          <h2 className="font-display text-xl font-semibold">Transport and application controls</h2>
          <p className="text-muted-foreground mt-2">
            Production traffic is served over HTTPS by Vercel. The application sends baseline
            browser security headers, keeps secrets in server-side environment variables, and scopes
            report, export, feedback, and deletion operations to the authenticated owner. We do not
            claim a particular TLS version or at-rest cipher here because those are managed by
            infrastructure providers and may change.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Authentication</h2>
          <p className="text-muted-foreground mt-2">
            Authentication uses Google sign-in through better-auth. Session records are stored in
            PostgreSQL and access to authenticated routes is checked on the server.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Database Security</h2>
          <p className="text-muted-foreground mt-2">
            Production data is stored in Neon Postgres. Authorization is enforced in application
            queries and database foreign keys; we do not currently claim PostgreSQL row-level
            security. Destructive ownership relationships use database cascades, and referral
            relationships are cleared when the referenced account is deleted.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Payment Security</h2>
          <p className="text-muted-foreground mt-2">
            Checkout and card collection are hosted by Dodo Payments. We store provider payment and
            refund identifiers, amounts, currencies, pack names, statuses, and credit movements; we
            do not receive or store full card numbers.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Operational safeguards</h2>
          <p className="text-muted-foreground mt-2">
            Production database migrations use the direct database endpoint and a PostgreSQL
            advisory lock. Preview builds skip migrations. A secret-protected scheduled endpoint
            marks abandoned research runs failed. These safeguards are tested in CI; this is not a
            claim of a formal audit or certification.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Reporting Vulnerabilities</h2>
          <p className="text-muted-foreground mt-2">
            If you discover a security vulnerability, please report it responsibly to{" "}
            <a
              href={`mailto:${siteConfig.emails.security}`}
              className="text-primary hover:underline">
              {siteConfig.emails.security}
            </a>
            . Please include reproduction steps and avoid accessing other users&apos; data. Our
            machine-readable disclosure contact is also published at{" "}
            <a href="/.well-known/security.txt" className="text-primary hover:underline">
              /.well-known/security.txt
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Limitations</h2>
          <p className="text-muted-foreground mt-2">
            No internet service can guarantee absolute security. We investigate credible reports and
            will provide notices when required by applicable law; we do not claim a certified
            incident-response program, a guaranteed response time, or continuous external auditing.
          </p>
        </section>
      </div>
    </div>
  );
}
