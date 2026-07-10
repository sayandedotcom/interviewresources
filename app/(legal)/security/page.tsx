import { Metadata } from "next";

import { siteConfig } from "@/site";

export const metadata: Metadata = {
  title: "Security",
  description: `Security policy for ${siteConfig.name}`,
};

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight">Security</h1>
      <p className="text-muted-foreground mt-4">
        We take security seriously. This page outlines our security practices and how to report
        vulnerabilities.
      </p>

      <div className="mt-8 space-y-6">
        <section>
          <h2 className="font-display text-xl font-semibold">Data Encryption</h2>
          <p className="text-muted-foreground mt-2">
            All data transmitted to and from {siteConfig.name} is encrypted using TLS 1.3. At rest,
            sensitive data is encrypted using AES-256 encryption.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Authentication</h2>
          <p className="text-muted-foreground mt-2">
            We use industry-standard OAuth 2.0 for authentication via Google. Session tokens are
            securely managed and expire after reasonable inactivity periods.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Database Security</h2>
          <p className="text-muted-foreground mt-2">
            Our database is hosted on Neon (PostgreSQL) with built-in security features including
            row-level security, encrypted connections, and automatic backups.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Payment Security</h2>
          <p className="text-muted-foreground mt-2">
            All payment processing is handled by Dodo Payments, a PCI DSS compliant payment
            provider. We never store credit card information on our servers.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Regular Security Audits</h2>
          <p className="text-muted-foreground mt-2">
            We regularly review and update our security practices. Our infrastructure is hosted on
            Vercel, which provides additional layers of security and DDoS protection.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Reporting Vulnerabilities</h2>
          <p className="text-muted-foreground mt-2">
            If you discover a security vulnerability, please report it responsibly to{" "}
            <a
              href={`mailto:${siteConfig.emails.security}`}
              className="text-[#AEF05A] hover:underline">
              {siteConfig.emails.security}
            </a>
            . We appreciate responsible disclosure and will work with you to address any issues
            promptly.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Incident Response</h2>
          <p className="text-muted-foreground mt-2">
            In the event of a security incident, we have procedures in place to respond quickly and
            transparently. Affected users will be notified promptly in accordance with applicable
            laws and regulations.
          </p>
        </section>
      </div>
    </div>
  );
}
