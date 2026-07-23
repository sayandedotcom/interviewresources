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

  return (
    <section id="about" className="w-full px-6 py-20 md:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          {about.title}
        </h2>
        <div className="mt-6 space-y-5">
          {about.paragraphs.map((p, i) => (
            <p key={i} className="font-display text-muted-foreground text-lg leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
