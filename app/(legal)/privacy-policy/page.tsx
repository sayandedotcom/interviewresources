import { Metadata } from "next";

import { siteConfig } from "@/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy Policy for ${siteConfig.name}`,
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="text-muted-foreground mt-4">Last updated: January 2025</p>

      <div className="mt-8 space-y-6">
        <section>
          <h2 className="font-display text-xl font-semibold">1. Information We Collect</h2>
          <p className="text-muted-foreground mt-2">
            We collect information you provide directly to us, including when you create an account,
            use our services, or communicate with us. This includes job descriptions, interview
            details, and any other information you choose to share.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">2. How We Use Your Information</h2>
          <p className="text-muted-foreground mt-2">
            We use the information we collect to provide, maintain, and improve our services,
            process transactions, send you technical notices and support messages, and respond to
            your questions and concerns.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">3. Information Sharing</h2>
          <p className="text-muted-foreground mt-2">
            We do not share your personal information with third parties except as described in this
            policy. We may share information with service providers who assist us in operating our
            platform, conducting our business, or serving our users.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">4. Data Security</h2>
          <p className="text-muted-foreground mt-2">
            We implement appropriate technical and organizational measures to protect the security
            of your personal information. However, no method of transmission over the Internet or
            electronic storage is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">5. Your Rights</h2>
          <p className="text-muted-foreground mt-2">
            Depending on your location, you may have certain rights regarding your personal
            information, including the right to access, correct, or delete your data. Contact us at{" "}
            {siteConfig.emails.privacy} to exercise these rights.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">6. Contact Us</h2>
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
