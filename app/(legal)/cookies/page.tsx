import { Metadata } from "next";

import { siteConfig } from "@/site";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: `Cookie Policy for ${siteConfig.name}`,
};

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight">Cookie Policy</h1>
      <p className="text-muted-foreground mt-4">Last updated: January 2025</p>

      <div className="mt-8 space-y-6">
        <section>
          <h2 className="font-display text-xl font-semibold">1. What Are Cookies</h2>
          <p className="text-muted-foreground mt-2">
            Cookies are small text files stored on your device when you visit a website. They help
            websites remember your preferences and improve your browsing experience.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">2. How We Use Cookies</h2>
          <p className="text-muted-foreground mt-2">
            We use cookies to understand how you interact with our service, maintain your session
            when logged in, remember your preferences, and analyze site traffic.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">3. Types of Cookies We Use</h2>
          <ul className="text-muted-foreground mt-2 space-y-2">
            <li>
              <strong>Essential Cookies:</strong> Required for the service to function properly
            </li>
            <li>
              <strong>Analytics Cookies:</strong> Help us understand how visitors use our site
            </li>
            <li>
              <strong>Preference Cookies:</strong> Remember your settings and preferences
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">4. Managing Cookies</h2>
          <p className="text-muted-foreground mt-2">
            You can control and/or delete cookies as you wish. You can delete all cookies that are
            already on your computer and you can set most browsers to prevent them from being
            placed.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">5. Third-Party Cookies</h2>
          <p className="text-muted-foreground mt-2">
            Some cookies are placed by third-party services that appear on our pages, such as
            authentication providers and analytics tools.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">6. Contact</h2>
          <p className="text-muted-foreground mt-2">
            For questions about our use of cookies, contact us at{" "}
            <a
              href={`mailto:${siteConfig.emails.privacy}`}
              className="text-[#AEF05A] hover:underline">
              {siteConfig.emails.privacy}
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
