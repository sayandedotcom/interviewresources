import { siteConfig } from "@/site";

import { Section, SectionHeader } from "@/components/sections/section";

/**
 * One marquee row. The list is rendered twice so the track can translate by
 * exactly half its width and loop seamlessly; the duplicate is hidden from
 * assistive tech. Pauses on hover, and holds still under reduced motion.
 */
function MarqueeRow({ items, reverse = false }: { items: string[]; reverse?: boolean }) {
  return (
    <div
      className={`flex w-max gap-3 hover:[animation-play-state:paused] motion-reduce:animate-none ${
        reverse
          ? "animate-[marquee-reverse_46s_linear_infinite]"
          : "animate-[marquee_40s_linear_infinite]"
      }`}>
      {[items, items].map((group, pass) =>
        group.map((company, i) => (
          <span
            key={`${pass}-${i}`}
            aria-hidden={pass === 1}
            className="silver-edge font-display bg-card text-foreground/75 shrink-0 rounded-full px-5 py-2.5 text-base font-medium shadow-[var(--shadow-xs)]">
            {company}
          </span>
        ))
      )}
    </div>
  );
}

export function CompaniesSection() {
  const { landing } = siteConfig.copy;
  const half = Math.ceil(siteConfig.companies.length / 2);
  const rows = [siteConfig.companies.slice(0, half), siteConfig.companies.slice(half)];

  return (
    <Section tone="plain">
      <SectionHeader eyebrow={landing.companies.eyebrow} title={landing.companies.title} />
      {/* overflow-hidden is load-bearing: the tracks are `w-max` and far wider than
          the viewport, and the mask only affects painting, not layout. Without it
          the whole page scrolls sideways. */}
      <div className="space-y-3 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <MarqueeRow items={rows[0]} />
        <MarqueeRow items={rows[1]} reverse />
      </div>
    </Section>
  );
}
