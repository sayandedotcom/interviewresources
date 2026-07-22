import { siteConfig } from "@/site";

import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  path: "/about",
  title: "About",
  description: `About ${siteConfig.name}`,
});

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight">About {siteConfig.name}</h1>

      <div className="mt-8 space-y-6">
        <section>
          <h2 className="font-display text-xl font-semibold">Our Mission</h2>
          <p className="text-muted-foreground mt-2">
            {siteConfig.name} helps job candidates prepare smarter for technical interviews. We
            believe that informed preparation leads to better outcomes, and that everyone deserves
            access to quality interview intelligence.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">What We Do</h2>
          <p className="text-muted-foreground mt-2">
            We leverage AI to research companies, analyze job descriptions, and generate potential
            interview questions based on publicly available information. Our platform aggregates
            insights from multiple sources to give you a comprehensive view of what to expect in
            your interviews.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Our Values</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">Transparency</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                We are clear about how our AI works and what data sources we use.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">Privacy First</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Your data is yours. We never sell personal information.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">Continuous Improvement</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                We are constantly improving our research quality and user experience.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">Accessibility</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Quality interview prep should be accessible to everyone.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Get In Touch</h2>
          <p className="text-muted-foreground mt-2">
            We would love to hear from you. Reach out at{" "}
            <a href={`mailto:${siteConfig.emails.hello}`} className="text-primary hover:underline">
              {siteConfig.emails.hello}
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
