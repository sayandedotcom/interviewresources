import { siteConfig } from "@/site";

import { Section } from "@/components/sections/section";

export function StatsSection() {
  return (
    <Section tone="tint">
      <div className="grid gap-8 sm:grid-cols-4">
        {siteConfig.stats.map((stat, i) => (
          <div key={i} className="text-center">
            <p className="font-display text-muted-foreground text-5xl font-bold tracking-tight">
              {stat.value}
            </p>
            <p className="text-muted-foreground/70 mt-2 text-xs tracking-widest uppercase">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}
