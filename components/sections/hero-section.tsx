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

/**
 * Shared entrance for the hero's stacked children, cascaded by `delay-*`.
 *
 * `fill-mode-both` is load-bearing, not decoration: tw-animate-css resolves
 * `--animate-in` with `var(--tw-animation-fill-mode, none)`, so without it a
 * delayed element paints its *final* state for the length of its delay and then
 * snaps back to the start — a visible flash on every element below the first.
 *
 * Under reduced motion the fade stays and only the travel is dropped; killing
 * the animation outright would strand these at `opacity: 0`.
 *
 * Duration is deliberately *not* in here — two `duration-*` classes on one
 * element resolve by stylesheet order rather than class order, so the card
 * could not reliably override a shared default. Each caller sets its own.
 */
const enter =
  "animate-in fade-in slide-in-from-bottom-2 fill-mode-both ease-out-strong motion-reduce:slide-in-from-bottom-0";

export function HeroSection() {
  const { landing } = siteConfig.copy;

  return (
    <section className="w-full">
      <div className="mx-auto w-full max-w-4xl px-6 pt-20 pb-16 text-center md:px-8 md:pt-28">
        <div
          className={`${enter} mb-6 flex items-center justify-center gap-3 delay-0 duration-500`}>
          <p className="text-[11px] tracking-[0.22em] text-white/70 uppercase">{landing.eyebrow}</p>
          <div className="flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            <span className="text-[10px] text-white/90">{siteConfig.userCount} users</span>
          </div>
        </div>

        <h1
          className={`${enter} font-display mx-auto mt-4 max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight text-white/80 delay-75 duration-500 md:text-6xl`}>
          {emphasized(landing.heroTitle.line1)}
          <br />
          {landing.heroTitle.line2}{" "}
          <span className="relative inline-block">
            {emphasized(landing.heroTitle.highlight)}
            <span className="absolute -bottom-1 left-0 h-3 w-full bg-white/25" />
          </span>
        </h1>

        <p
          className={`${enter} font-display mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/85 delay-150 duration-500`}>
          {landing.heroSub}
        </p>

        <div
          className={`${enter} mt-8 flex flex-col items-center justify-center gap-4 delay-200 duration-500 sm:flex-row`}>
          <Link
            href={landing.heroCtaPrimary.href}
            aria-label={landing.heroCtaPrimary.ariaLabel}
            className="font-display text-brand-700 ease-out-strong inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-full bg-[image:var(--gradient-glossy-white)] px-6 py-3 text-sm font-semibold shadow-[var(--shadow-glossy-white)] transition-[box-shadow,translate,scale] duration-150 hover:bg-[image:var(--gradient-glossy-white-hover)] hover:shadow-[var(--shadow-glossy-white-hover)] active:translate-y-px active:scale-[0.98] active:shadow-[var(--shadow-glossy-white-active)]">
            {landing.heroCtaPrimary.label}
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href={landing.heroCtaSecondary.href}
            className="font-display ease-out-strong inline-flex min-h-11 cursor-pointer items-center rounded-full bg-[image:var(--gradient-glossy-ghost)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-glossy-ghost)] backdrop-blur-sm transition-[box-shadow,translate,scale] duration-150 hover:bg-[image:var(--gradient-glossy-ghost-hover)] hover:shadow-[var(--shadow-glossy-ghost-hover)] active:translate-y-px active:scale-[0.98] active:shadow-[var(--shadow-glossy-ghost-active)]">
            {landing.heroCtaSecondary.label}
          </Link>
        </div>

        <p className={`${enter} font-display mt-6 text-sm text-white/70 delay-300 duration-500`}>
          {landing.heroFomo}
        </p>
      </div>

      {/* The card anchors the cascade: it starts with the last line of copy but
          takes longer to settle, so the hero resolves onto it. */}
      <div className={`${enter} px-6 delay-300 duration-700 md:px-8`}>
        <HeroProductCard />
      </div>
    </section>
  );
}
