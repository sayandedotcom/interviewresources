import Link from "next/link";

import { siteConfig } from "@/site";
import { ChevronRight } from "lucide-react";

import { HeroProductCard } from "@/components/sections/hero-product-card";

/** Renders "AI" and the price at full white against the blue sky, with the rest
 * of the title held slightly back — the brand accent can't read blue-on-blue. */
function emphasized(text: string) {
  return text.split(/(\bAI\b|\$0\.50)/).map((part, i) =>
    part === "AI" || part === "$0.50" ? (
      <span key={i} className="text-white">
        {part}
      </span>
    ) : (
      part
    )
  );
}

export function HeroSection() {
  const { landing } = siteConfig.copy;

  return (
    <section className="w-full">
      <div className="mx-auto w-full max-w-4xl px-6 pt-20 pb-16 text-center md:px-8 md:pt-28">
        <p className="font-display mb-4 text-sm font-semibold tracking-tight text-white">
          {siteConfig.name}
        </p>
        <div className="mb-6 flex items-center justify-center gap-3">
          <p className="text-[11px] tracking-[0.22em] text-white/70 uppercase">{landing.eyebrow}</p>
          <div className="flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            <span className="text-[10px] text-white/90">{siteConfig.userCount} users</span>
          </div>
        </div>

        <h1 className="font-display mx-auto max-w-3xl text-5xl leading-[1.05] font-semibold tracking-tight text-white/80 md:text-7xl">
          {emphasized(landing.heroTitle.line1)}
          <br />
          {landing.heroTitle.line2}{" "}
          <span className="relative inline-block">
            {emphasized(landing.heroTitle.highlight)}
            <span className="absolute -bottom-1 left-0 h-3 w-full bg-white/25" />
          </span>
        </h1>

        <p className="font-display mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/85">
          {landing.heroSub}
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href={landing.heroCtaPrimary.href}
            aria-label={landing.heroCtaPrimary.ariaLabel}
            className="font-display text-brand-700 inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-full bg-[image:var(--gradient-glossy-white)] px-6 py-3 text-sm font-semibold shadow-[var(--shadow-glossy-white)] transition-all hover:bg-[image:var(--gradient-glossy-white-hover)] hover:shadow-[var(--shadow-glossy-white-hover)] active:translate-y-px active:shadow-[var(--shadow-glossy-white-active)]">
            {landing.heroCtaPrimary.label}
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href={landing.heroCtaSecondary.href}
            className="font-display inline-flex min-h-11 cursor-pointer items-center rounded-full bg-[image:var(--gradient-glossy-ghost)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-glossy-ghost)] backdrop-blur-sm transition-all hover:bg-[image:var(--gradient-glossy-ghost-hover)] hover:shadow-[var(--shadow-glossy-ghost-hover)] active:translate-y-px active:shadow-[var(--shadow-glossy-ghost-active)]">
            {landing.heroCtaSecondary.label}
          </Link>
        </div>

        <p className="font-display mt-6 text-sm text-white/70">{landing.heroFomo}</p>
      </div>

      <div className="px-6 md:px-8">
        <HeroProductCard />
      </div>
    </section>
  );
}
