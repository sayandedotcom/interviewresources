import { siteConfig } from "@/site";

import { BreadcrumbJsonLd } from "@/components/json-ld";

import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  path: "/terms-of-service",
  title: "Terms of Service",
  description: `Terms of Service for ${siteConfig.name}`,
});

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <BreadcrumbJsonLd path="/terms-of-service" />
      <h1 className="font-display text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="text-muted-foreground mt-4">Last updated: July 24, 2026</p>

      <div className="mt-8 space-y-6">
        <section>
          <h2 className="font-display text-xl font-semibold">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground mt-2">
            By accessing or using {siteConfig.name}, you agree to be bound by these Terms of
            Service. If you do not agree to these terms, please do not use our services.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">2. Description of Service</h2>
          <p className="text-muted-foreground mt-2">
            {siteConfig.name} provides AI-powered interview preparation and research services. Our
            platform analyzes job descriptions and generates potential interview questions and
            talking points based on publicly available information.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">3. User Accounts</h2>
          <p className="text-muted-foreground mt-2">
            You are responsible for maintaining the confidentiality of your account credentials and
            for all activities that occur under your account. You agree to notify us immediately of
            any unauthorized use of your account.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">4. Acceptable Use</h2>
          <p className="text-muted-foreground mt-2">
            You agree not to use our services for any illegal purposes or in violation of any
            applicable laws. You must not attempt to gain unauthorized access to our systems or
            interfere with the proper functioning of the platform.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">5. AI and source limitations</h2>
          <p className="text-muted-foreground mt-2">
            Reports are predictions assembled from public web sources and AI processing. They may
            omit information, misinterpret a source, or fail to match your actual interview.
            Evidence links let you evaluate the basis, but neither a citation nor a confidence label
            guarantees accuracy. Do not rely on a report as an employer statement or promise of an
            interview outcome.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">6. Credits and billing</h2>
          <p className="text-muted-foreground mt-2">
            Credit packs are one-time purchases, not subscriptions. Credits do not have a scheduled
            expiration. Research is metered and charged after successful completion based on
            measured provider cost, subject to the selected effort cap and available balance. Failed
            or abandoned runs are not charged, although a completed extension is.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">7. Refunds</h2>
          <p className="text-muted-foreground mt-2">
            Contact {siteConfig.emails.support} with the payment reference to request a refund.
            Eligibility depends on applicable law and the circumstances of the purchase. When Dodo
            confirms a full or partial refund, the corresponding granted credits are reversed
            proportionally. Credits already spent may leave the account unable to run new research
            until its balance is restored.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">8. Intellectual Property</h2>
          <p className="text-muted-foreground mt-2">
            The service and its original content, features, and functionality are owned by{" "}
            {siteConfig.name} and are protected by international copyright, trademark, and other
            intellectual property laws.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">9. Limitation of Liability</h2>
          <p className="text-muted-foreground mt-2">
            {siteConfig.name} shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages resulting from your use or inability to use the
            service.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">10. Changes to Terms</h2>
          <p className="text-muted-foreground mt-2">
            We reserve the right to modify or replace these terms at any time. Your continued use of
            the service after any changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">11. Contact</h2>
          <p className="text-muted-foreground mt-2">
            If you have any questions about these Terms, please contact us at{" "}
            <a href={`mailto:${siteConfig.emails.legal}`} className="text-primary hover:underline">
              {siteConfig.emails.legal}
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
