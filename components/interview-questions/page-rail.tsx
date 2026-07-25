"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

export type RailSection = { id: string; label: string };

/**
 * Which section is currently being read, or null when none is.
 *
 * Deliberately not shared with the header's near-identical hook: that one
 * collapses the root to a thin strip across the middle because landing sections
 * are a screen tall each. These sections are a few hundred pixels, so the same
 * band would leave long stretches with nothing active. This one keeps a wider
 * top-weighted band and takes the last entry to cross it.
 */
function useActiveSection(sections: RailSection[]) {
  const [active, setActive] = useState<string | null>(null);
  // A joined key rather than the array itself: the caller builds `sections`
  // inline, so a `sections` dependency would tear down and rebuild the observer
  // on every render.
  const idKey = sections.map((section) => section.id).join(",");

  useEffect(() => {
    const elements = idKey
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-12% 0px -55% 0px" }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [idKey]);

  return active;
}

export function PageRail({
  sections,
  ctaHref,
  ctaLabel,
  ctaNote,
}: {
  sections: RailSection[];
  ctaHref: string;
  ctaLabel: string;
  ctaNote: string;
}) {
  const active = useActiveSection(sections);
  const reduce = useReducedMotion();

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-8">
        <p className="text-tertiary text-[11px] font-semibold tracking-[0.2em] uppercase">
          On this page
        </p>
        <nav className="mt-4">
          <ul className="space-y-1">
            {sections.map((section) => {
              const isActive = active === section.id;

              return (
                <li key={section.id} className="relative">
                  {isActive && (
                    <motion.span
                      layoutId="rail-active"
                      className="bg-primary absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full"
                      transition={
                        reduce ? { duration: 0 } : { type: "spring", duration: 0.4, bounce: 0.15 }
                      }
                    />
                  )}
                  <a
                    href={`#${section.id}`}
                    aria-current={isActive ? "location" : undefined}
                    className={cn(
                      "font-display block border-l py-1.5 pl-4 text-sm transition-colors",
                      isActive
                        ? "text-foreground border-transparent font-medium"
                        : "text-muted-foreground hover:text-foreground border-border"
                    )}>
                    {section.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="silver-edge bg-background mt-8 rounded-2xl p-5 shadow-[var(--shadow-xs)]">
          <p className="font-display text-muted-foreground text-[13px] leading-relaxed">
            {ctaNote}
          </p>
          <Link
            href={ctaHref}
            className="font-display ease-out-strong mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[image:var(--gradient-glossy)] px-4 text-sm font-semibold text-white shadow-[var(--shadow-glossy)] transition-[box-shadow,translate,scale] duration-150 hover:bg-[image:var(--gradient-glossy-hover)] hover:shadow-[var(--shadow-glossy-hover)] active:translate-y-px active:scale-[0.98] active:shadow-[var(--shadow-glossy-active)]">
            {ctaLabel}
          </Link>
        </div>
      </div>
    </aside>
  );
}
