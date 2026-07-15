"use client";

import React, { useRef, useState } from "react";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";

import { cn } from "@/lib/utils";

type Stage = {
  label: string;
  title: string;
  description: string;
  content?: React.ReactNode;
};

/** The active stage's eyebrow, title, and description, cross-fading on change.
 * Rendered twice: in the xl+ margin rail and stacked below the panel otherwise. */
function StageText({ stage, index }: { stage: Stage; index: number }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}>
        <p className="text-tertiary mb-2 font-mono text-[11px] tracking-[0.22em] uppercase">
          {String(index + 1).padStart(2, "0")} · {stage.label}
        </p>
        <h3 className="font-display text-2xl font-semibold tracking-tight">{stage.title}</h3>
        <p className="font-display text-muted-foreground mt-4 leading-relaxed">
          {stage.description}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Scroll-pinned stepper. The section is tall enough to give each stage a full
 * screen of scroll; an inner sticky wrapper "locks" the stepper and the active
 * panel to the viewport while the section scrolls past, advancing the active
 * stage as it goes. Rewritten from the generic side-by-side reveal into this
 * vertical, top-stepper layout.
 */
export const StickyScroll = ({
  content,
  contentClassName,
}: {
  content: Stage[];
  contentClassName?: string;
}) => {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const cardLength = content.length;

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const breakpoints = content.map((_, index) => index / cardLength);
    const closest = breakpoints.reduce((acc, breakpoint, index) => {
      return Math.abs(latest - breakpoint) < Math.abs(latest - breakpoints[acc]) ? index : acc;
    }, 0);
    setActive(closest);
  });

  return (
    <div ref={ref} style={{ height: `${cardLength * 90}vh` }} className="relative">
      {/* The stepper and panel stay centered where the section puts them; the
          stage text hangs in the page's left margin (absolute, off the content's
          left edge), the same trick as the estimate rail. Below xl there is no
          margin to hang in, so the text stacks under the panel instead. */}
      <div className="sticky top-10">
        <div className="absolute top-16 right-full mr-12 hidden w-80 xl:block">
          <StageText stage={content[active]} index={active} />
        </div>

        <div className="flex flex-col gap-8">
          {/* Stepper: numbered pills joined by a line that fills up to the active stage. */}
          <div className="flex items-center">
            {content.map((stage, index) => (
              <React.Fragment key={stage.label}>
                <div className="flex shrink-0 items-center gap-2.5">
                  <span
                    className={cn(
                      "font-display flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-300",
                      index <= active
                        ? "border-tertiary bg-tertiary text-tertiary-foreground"
                        : "border-border text-muted-foreground"
                    )}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "font-display text-sm font-medium transition-colors duration-300",
                      index === active ? "text-foreground" : "text-muted-foreground"
                    )}>
                    {stage.label}
                  </span>
                </div>
                {index < cardLength - 1 && (
                  <div className="bg-border relative mx-3 h-px flex-1">
                    <motion.div
                      className="bg-tertiary absolute inset-y-0 left-0"
                      animate={{ width: index < active ? "100%" : "0%" }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* The active stage's panel, spanning the stepper's full width. */}
          <div
            className={cn(
              "bg-card flex h-[calc(100vh-10rem)] overflow-hidden rounded-xl border",
              contentClassName
            )}>
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="h-full w-full">
                {content[active].content ?? null}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Below xl the margin rail is hidden; the text stacks here instead. */}
          <div className="xl:hidden">
            <StageText stage={content[active]} index={active} />
          </div>
        </div>
      </div>
    </div>
  );
};
