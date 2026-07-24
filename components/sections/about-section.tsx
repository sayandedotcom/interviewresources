import Link from "next/link";

import { siteConfig } from "@/site";

/**
 * The plain-language "what this app is" band, immediately under the hero.
 *
 * Exists for humans skimming for orientation and for Google's OAuth branding
 * reviewers, who check that the homepage names the app exactly as the consent
 * screen does and states its purpose. Don't rename the heading away from
 * `siteConfig.name`, and don't move this below the fold-adjacent position — the
 * review is a shallow read of the page.
 */
export function AboutSection() {
  const { about } = siteConfig.copy.landing;
  const [purpose, googleSignIn] = about.paragraphs;

  return (
    <section id="about" className="w-full px-6 py-20 md:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          {about.title}
        </h2>
        <p className="font-display text-muted-foreground mt-6 text-lg leading-relaxed">{purpose}</p>

        <div className="border-primary/20 bg-primary/5 mt-8 rounded-2xl border p-6">
          <h3 className="font-display text-xl font-semibold tracking-tight">
            Google sign-in and your data
          </h3>
          <p className="font-display text-muted-foreground mt-3 text-base leading-relaxed">
            {googleSignIn}
          </p>
          <Link
            href="/privacy-policy"
            className="font-display text-primary mt-4 inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline">
            Read the Interview Resources Privacy Policy
          </Link>
        </div>
      </div>
    </section>
  );
}
