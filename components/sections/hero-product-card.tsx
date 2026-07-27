"use client";

import { useRef } from "react";

import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";

import { HeroReportPanel } from "@/components/sections/hero-report-panel";

/**
 * The hero's floating product-UI card, wrapping the mock report in
 * `hero-report-panel.tsx` (browser chrome, question cards, confidence badges).
 *
 * Two elements carry motion here and they have to stay separate: the wrapper in
 * `hero-section.tsx` owns the CSS entrance, the inner `motion.div` below owns
 * the scroll-linked transform. Both write `transform`, so putting them on one
 * element would have them clobber each other.
 *
 * The card sits at the fold, so a conventional enter-the-viewport reveal would
 * barely fire. Instead it drifts against the scroll as the hero leaves, so the
 * product stays alive rather than sliding away like wallpaper.
 */
export function HeroProductCard() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  // Springs rather than raw scroll linkage: tying a transform straight to scroll
  // position reads as mechanical. Low bounce — this is a product shot, not a toy.
  const spring = { stiffness: 100, damping: 20 } as const;
  const y = useSpring(useTransform(scrollYProgress, [0, 1], [24, -24]), spring);
  const scale = useSpring(useTransform(scrollYProgress, [0, 0.5], [0.97, 1]), spring);

  // A composed transform string, not Motion's `y`/`scale` shorthands — those run
  // on the main thread via rAF and drop frames exactly when the page is busy.
  const transform = useMotionTemplate`translateY(${y}px) scale(${scale})`;

  return (
    <div ref={ref} className="relative mx-auto -mt-4 w-full max-w-5xl md:-mt-8">
      <motion.div style={reduce ? undefined : { transform }}>
        <div className="silver-edge bg-card h-[520px] overflow-hidden rounded-3xl shadow-[var(--shadow-float)] md:h-[600px]">
          <HeroReportPanel revealRows />
        </div>
      </motion.div>
      <div className="from-background pointer-events-none absolute inset-x-0 -bottom-1 h-24 bg-gradient-to-t to-transparent" />
    </div>
  );
}
