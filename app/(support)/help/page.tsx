import { Metadata } from "next";

import { siteConfig } from "@/site";

export const metadata: Metadata = {
  title: "Help & Documentation",
  description: `Get help with ${siteConfig.name}`,
};

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight">Help & Documentation</h1>
      <p className="text-muted-foreground mt-4">
        Find answers to common questions and learn how to get the most out of {siteConfig.name}.
      </p>

      <div className="mt-8 space-y-8">
        <section>
          <h2 className="font-display text-xl font-semibold">Getting Started</h2>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">How do I create an account?</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Click the &ldquo;Sign in&rdquo; button in the header and select Google OAuth to
                quickly create an account and start your first research session.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">How does credit-based pricing work?</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Each research session costs credits based on the complexity of your request. Basic
                research uses fewer credits while comprehensive research uses more.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">What payment methods do you accept?</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                We accept all major credit cards through our secure payment provider. Credit packs
                can be purchased from your account dashboard.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Using Research Sessions</h2>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">What information should I include?</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Include the job description, your years of experience, tech stack, and any specific
                interview formats you know about for the best results.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">How long does research take?</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Most research sessions complete within a few minutes. Complex requests with multiple
                rounds may take slightly longer.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">Can I save my research sessions?</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Yes, sign in with Google to save all your research sessions and access them from any
                device.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Still Need Help?</h2>
          <p className="text-muted-foreground mt-2">
            Can not find what you are looking for? Reach out to our support team at{" "}
            <a
              href={`mailto:${siteConfig.emails.support}`}
              className="text-primary hover:underline">
              {siteConfig.emails.support}
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
