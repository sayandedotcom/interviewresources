import { siteConfig } from "@/site";

import { BreadcrumbJsonLd } from "@/components/json-ld";

import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  path: "/privacy-policy",
  title: "Privacy Policy",
  description: `Privacy Policy for ${siteConfig.name}`,
});

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <BreadcrumbJsonLd path="/privacy-policy" />
      <h1 className="font-display text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="text-muted-foreground mt-4">Last updated: July 24, 2026</p>

      <div className="mt-8 space-y-6">
        <section>
          <h2 className="font-display text-xl font-semibold">1. Information We Collect</h2>
          <p className="text-muted-foreground mt-2">
            We collect information you provide directly to us, including when you create an account,
            use our services, or communicate with us. This includes job descriptions, interview
            details, and any other information you choose to share.
          </p>
        </section>

        {/* Required by Google's OAuth verification: the policy has to name the
            Google account data the app receives and state the Limited Use
            commitment. Keep the scope list in step with the scopes requested in
            the Google Cloud consent screen. */}
        <section>
          <h2 className="font-display text-xl font-semibold">
            2. Google Account Data ({siteConfig.name} sign-in)
          </h2>
          <p className="text-muted-foreground mt-2">
            You sign in to {siteConfig.name} with your Google account. We request only the basic
            profile and email scopes, which give us your name, email address, profile picture, and
            Google account ID. We use them solely to create your account, sign you in, and show your
            name and picture in the app. We do not currently use Google account data to send report
            emails.
          </p>
          <p className="text-muted-foreground mt-2">
            We do not access your Gmail, Drive, Calendar, Contacts, or any other Google service, and
            we never sell this data or use it for advertising. {siteConfig.name}&apos;s use of
            information received from Google APIs adheres to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. You can delete your account and the data tied
            to it from Settings. You may also contact {siteConfig.emails.privacy}.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">3. How We Use Your Information</h2>
          <p className="text-muted-foreground mt-2">
            We use the information we collect to provide, maintain, and improve our services,
            process transactions, send you technical notices and support messages, and respond to
            your questions and concerns.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">4. Service providers</h2>
          <p className="text-muted-foreground mt-2">
            We send data only as needed to operate the service: Vercel (hosting and optional
            consent-gated analytics), Neon (database), Google (sign-in and Gemini AI generation),
            Tavily (web search and extraction), Dodo Payments (checkout, payments, and refunds), and
            Google Analytics when you explicitly accept analytics cookies. Public report links are
            visible to anyone who receives their unguessable share token.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">5. Retention and deletion</h2>
          <p className="text-muted-foreground mt-2">
            We retain account, credit, payment, outcome, and product-event records while your
            account exists. The product keeps at most ten recent research sessions per account;
            older sessions and their reports are removed automatically while their credit ledger
            entries remain until account deletion. Deleting your account removes owned sessions,
            reports, outcomes, credits, payments, refunds, authentication records, and identifiable
            product events, and clears referral links from other accounts. Infrastructure backups
            may retain deleted data temporarily according to provider backup cycles.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">6. AI processing and limitations</h2>
          <p className="text-muted-foreground mt-2">
            Job and interview context, public-source extracts, and generated drafts are processed by
            AI and search providers to create reports. Generated predictions can be incomplete or
            wrong and should not be treated as statements from an employer or guarantees about an
            interview.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">7. Your Rights</h2>
          <p className="text-muted-foreground mt-2">
            Depending on your location, you may have certain rights regarding your personal
            information, including the right to access, correct, or delete your data. Contact us at{" "}
            {siteConfig.emails.privacy} to exercise these rights.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">8. Contact Us</h2>
          <p className="text-muted-foreground mt-2">
            If you have any questions about this Privacy Policy, please contact us at{" "}
            <a
              href={`mailto:${siteConfig.emails.privacy}`}
              className="text-primary hover:underline">
              {siteConfig.emails.privacy}
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
