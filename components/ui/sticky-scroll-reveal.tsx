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
        <p className="text-tertiary mb-2 text-[11px] tracking-[0.22em] uppercase">
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
 * screen of scroll; an inner sticky wrapper "locks" the stage text, the tabs and
 * the active panel to the viewport while the section scrolls past, advancing the
 * active stage as it goes.
 *
 * Layout is a two-column grid: the stage copy sits in the left column (in normal
 * flow, so it is always on screen) and the tabs + panel occupy the right column.
 * Below lg the copy stacks above the tabs.
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

  /** Tabs are real controls: clicking one scrolls to that stage's slice of the
   * section, which then drives `active` through the usual scroll handler. */
  const goToStage = (index: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.offsetTop + (el.offsetHeight * index) / cardLength;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <div ref={ref} style={{ height: `${cardLength * 90}vh` }} className="relative">
      <div className="sticky top-10 grid gap-8 lg:grid-cols-[minmax(16rem,20rem)_1fr] lg:gap-10">
        {/* Left column: the active stage's copy, pinned to the top of the panel. */}
        <div className="lg:pt-14">
          <StageText stage={content[active]} index={active} />
        </div>

        {/* Right column: tabs + flow progress above the active panel. */}
        <div className="flex min-w-0 flex-col gap-6">
          {/* Tabs: numbered pills joined by a line that fills up to the active stage. */}
          <div className="silver-edge bg-card flex items-center rounded-full px-5 py-2.5 shadow-[var(--shadow-sm)]">
            {content.map((stage, index) => (
              <React.Fragment key={stage.label}>
                <button
                  type="button"
                  onClick={() => goToStage(index)}
                  aria-current={index === active ? "step" : undefined}
                  className="group flex shrink-0 cursor-pointer items-center gap-2.5">
                  <span
                    className={cn(
                      "font-display flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-300",
                      index <= active
                        ? "border-tertiary bg-tertiary text-tertiary-foreground"
                        : "border-border text-muted-foreground group-hover:border-tertiary/50"
                    )}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "font-display hidden text-sm font-medium transition-colors duration-300 sm:inline",
                      index === active
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}>
                    {stage.label}
                  </span>
                </button>
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

          {/* The active stage's panel, in a brand cradle to match the other sections. */}
          <div className="silver-edge from-brand-100/90 to-brand-50/30 rounded-3xl bg-gradient-to-b p-3 shadow-[var(--shadow-sm)] sm:p-4">
            <div
              className={cn(
                "border-border/50 bg-background flex h-[34rem] overflow-hidden rounded-2xl border shadow-[var(--shadow-md)]",
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
          </div>
        </div>
      </div>
    </div>
  );
};
