import { siteConfig } from "@/site";
import { Infinity as InfinityIcon, Coins, ShieldCheck } from "lucide-react";

import { Section } from "@/components/sections/section";

const ICONS = [Coins, ShieldCheck, InfinityIcon];

/**
 * The billing guarantees. Deliberately one silver-edged surface split by
 * hairlines rather than three separate cards: these are peer clauses of a single
 * commitment, not a sequence or a ranking, so there's nothing for colour to
 * encode. Kept achromatic — it reads as terms, which is the point.
 */
export function GuaranteeSection() {
  return (
    <Section tone="tint">
      <div className="silver-edge bg-background overflow-hidden rounded-3xl shadow-[var(--shadow-sm)]">
        <div className="divide-border/60 grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {siteConfig.copy.guarantee.items.map((item, i) => {
            const Icon = ICONS[i];
            return (
              <div key={item.title} className="p-8 md:p-10">
                <span className="bg-muted flex h-11 w-11 items-center justify-center rounded-xl">
                  <Icon className="text-foreground/70 h-5 w-5" strokeWidth={1.75} />
                </span>
                <h3 className="font-display mt-5 text-xl font-semibold tracking-tight">
                  {item.title}
                </h3>
                <p className="font-display text-muted-foreground mt-2 text-base leading-relaxed">
                  {item.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
