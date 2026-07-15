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
      <div className="sticky top-16 flex flex-col gap-8">
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

        {/* Active stage: heading/description, then the bespoke panel. */}
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <div className="max-w-md">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}>
                <h3 className="font-display text-2xl font-semibold tracking-tight">
                  {content[active].title}
                </h3>
                <p className="font-display text-muted-foreground mt-4 leading-relaxed">
                  {content[active].description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div
            className={cn("bg-card min-h-80 overflow-hidden rounded-xl border", contentClassName)}>
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="h-full">
                {content[active].content ?? null}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
