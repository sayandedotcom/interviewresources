"use client";

import { siteConfig } from "@/site";
import { Compass, Gauge, Globe, Link2, Route, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";

/** A faint mock sits behind the card's title/description. Everything is
 * pointer-events-none and low-contrast so the copy stays the focus. */
const wrap = "pointer-events-none absolute inset-0 overflow-hidden opacity-70";

/** 01 · Plan: planned queries stagger in, each with its purpose. */
function PlanBg() {
  const reduce = useReducedMotion();
  const queries = [
    { q: "stripe.com engineering interview process", p: "loop format" },
    { q: "stripe system design interview questions", p: "system design round" },
    { q: "stripe behavioral values interview", p: "behavioral round" },
  ];
  return (
    <div className={wrap}>
      <div className="space-y-2 p-4">
        {queries.map((item, i) => (
          <motion.div
            key={item.q}
            initial={reduce ? false : { opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 * i, duration: 0.4 }}
            className="border-border bg-card rounded-md border px-2.5 py-1.5">
            <p className="text-foreground/80 font-mono text-[10px]">{item.q}</p>
            <p className="text-tertiary font-mono text-[9px]">→ {item.p}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** 02 · Read: source chips with a scanning shimmer sweeping across. */
function ReadBg() {
  const reduce = useReducedMotion();
  const sources = ["Engineering blog", "Job posting", "Candidate review", "Conference talk"];
  return (
    <div className={wrap}>
      <div className="flex flex-wrap gap-2 p-4">
        {sources.map((s) => (
          <span
            key={s}
            className="border-border bg-card text-muted-foreground flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px]">
            <span className="bg-tertiary inline-block h-1.5 w-1.5 rounded-full" />
            {s}
          </span>
        ))}
      </div>
      {!reduce && (
        <motion.div
          className="via-tertiary/15 absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent to-transparent"
          animate={{ x: ["-40%", "340%"] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}

/** 03 · Scope: round + section toggle chips, some switched off. */
function ScopeBg() {
  const chips = [
    { label: "Coding", on: true },
    { label: "System Design", on: true },
    { label: "Behavioral", on: false },
    { label: "Company", on: true },
    { label: "Interview loop", on: false },
    { label: "Skills", on: true },
  ];
  return (
    <div className={wrap}>
      <div className="flex flex-wrap gap-2 p-4">
        {chips.map((c) => (
          <span
            key={c.label}
            className={`font-display rounded-full border px-2.5 py-1 text-[11px] ${
              c.on
                ? "border-tertiary bg-tertiary/10 text-tertiary"
                : "border-border text-muted-foreground/50 line-through"
            }`}>
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** 04 · Effort: Low/Med/High bars whose widths ease in on view. */
function EffortBg() {
  const reduce = useReducedMotion();
  const rows = [
    { label: "Low", width: "34%", meta: "3–5 queries · 8–15 Q" },
    { label: "Medium", width: "62%", meta: "4–8 queries · 15–30 Q" },
    { label: "High", width: "100%", meta: "8–12 queries · 30–50 Q" },
  ];
  return (
    <div className={wrap}>
      <div className="space-y-3 p-4">
        {rows.map((r, i) => (
          <div key={r.label}>
            <div className="text-muted-foreground mb-1 flex justify-between font-mono text-[9px]">
              <span>{r.label}</span>
              <span>{r.meta}</span>
            </div>
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <motion.div
                className="bg-tertiary h-full rounded-full"
                initial={reduce ? false : { width: 0 }}
                whileInView={{ width: r.width }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i, duration: 0.6, ease: "easeOut" }}
                style={reduce ? { width: r.width } : undefined}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 05 · Broaden: the "evidence thin → broadening" fallback state. */
function BroadenBg() {
  return (
    <div className={wrap}>
      <div className="space-y-2 p-4 font-mono text-[10px]">
        <p className="text-muted-foreground">direct interview evidence… thin</p>
        <p className="text-tertiary">↳ broadening: founders · funding · similar cos</p>
        <div className="mt-2 flex gap-1.5">
          <span className="border-status-warning/40 text-status-warning bg-status-warning/10 rounded border px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase">
            inferred
          </span>
          <span className="border-border text-muted-foreground rounded border px-1.5 py-0.5 text-[9px] uppercase">
            labelled
          </span>
        </div>
      </div>
    </div>
  );
}

/** 06 · Evidence: a question row with confidence + source links. */
function EvidenceBg() {
  return (
    <div className={wrap}>
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <span className="text-status-good border-status-good/30 bg-status-good/10 rounded-full border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase">
            High
          </span>
          <span className="text-muted-foreground font-mono text-[9px]">confidence</span>
        </div>
        <p className="font-display text-foreground/80 text-xs leading-snug">
          How do you guarantee idempotency on the payments API?
        </p>
        <div className="text-tertiary space-y-1">
          {["Stripe Engineering blog", "Interview review · levels.fyi"].map((s) => (
            <div key={s} className="flex items-center gap-1.5 text-[10px]">
              <Link2 className="h-3 w-3 shrink-0" />
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const TILES = [
  { Icon: Route, background: <PlanBg /> },
  { Icon: Globe, background: <ReadBg /> },
  { Icon: SlidersHorizontal, background: <ScopeBg /> },
  { Icon: Gauge, background: <EffortBg /> },
  { Icon: Compass, background: <BroadenBg /> },
  { Icon: ShieldCheck, background: <EvidenceBg /> },
];

export function HowAgentWorksSection() {
  const { agent } = siteConfig.copy;

  return (
    <section id="how-agent-works" className="mx-auto w-full max-w-5xl border-t px-5 py-16">
      <div className="mb-10 text-center">
        <p className="text-tertiary mb-2 font-mono text-[11px] tracking-[0.22em] uppercase">
          {agent.eyebrow}
        </p>
        <h2 className="font-display text-2xl font-semibold tracking-tight">{agent.title}</h2>
        <p className="font-display text-muted-foreground mx-auto mt-2 max-w-xl">{agent.sub}</p>
      </div>
      <BentoGrid className="auto-rows-[19rem] grid-cols-1 md:grid-cols-3">
        {agent.tiles.map((tile, i) => (
          <BentoCard
            key={tile.name}
            name={tile.name}
            description={tile.description}
            Icon={TILES[i].Icon}
            background={TILES[i].background}
            className="col-span-1"
          />
        ))}
      </BentoGrid>
    </section>
  );
}
