"use client";

import { siteConfig } from "@/site";
import { Gauge, Globe, Link2, Route, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

/**
 * One step of the pipeline: a brand-tinted cradle holding a white mock panel,
 * with the step number, icon, and copy below it. Deliberately single-hue — the
 * five tiles are one sequence, so colour is used for depth, not to tell them
 * apart. The step number does that.
 */
function Step({
  index,
  Icon,
  name,
  description,
  mock,
  wide = false,
}: {
  index: number;
  Icon: React.ElementType;
  name: string;
  description: string;
  mock: React.ReactNode;
  wide?: boolean;
}) {
  const copy = (
    <div className={wide ? "" : "mt-6"}>
      <div className="flex items-center gap-3">
        <span className="bg-brand-100 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <Icon className="text-primary h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className="text-primary text-xs font-semibold tracking-[0.2em] tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <h3 className="font-display mt-4 text-xl font-semibold tracking-tight">{name}</h3>
      <p className="font-display text-muted-foreground mt-2 text-base leading-relaxed">
        {description}
      </p>
    </div>
  );

  const panel = (
    <div className="border-border/50 bg-background overflow-hidden rounded-2xl border shadow-[var(--shadow-md)]">
      {mock}
    </div>
  );

  return (
    <div
      className={`silver-edge from-brand-100/90 to-brand-50/30 rounded-3xl bg-gradient-to-b p-5 shadow-[var(--shadow-sm)] sm:p-6 ${
        wide ? "sm:p-8" : ""
      }`}>
      {wide ? (
        <div className="grid items-center gap-8 md:grid-cols-2">
          {panel}
          {copy}
        </div>
      ) : (
        <>
          {panel}
          {copy}
        </>
      )}
    </div>
  );
}

/** 01 · Plan: planned queries stagger in, each with its stated purpose. */
function PlanMock() {
  const reduce = useReducedMotion();
  const queries = [
    { q: "stripe interview process", p: "loop format" },
    { q: "stripe system design questions", p: "system design round" },
    { q: "stripe behavioral values", p: "behavioral round" },
  ];
  return (
    <div className="space-y-2 p-4">
      {queries.map((item, i) => (
        <motion.div
          key={item.q}
          initial={reduce ? false : { opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 * i, duration: 0.4 }}
          className="border-border/60 bg-muted/30 rounded-lg border px-3 py-2">
          <p className="text-foreground truncate text-xs">{item.q}</p>
          <p className="text-primary text-[11px] font-medium">→ {item.p}</p>
        </motion.div>
      ))}
    </div>
  );
}

/** 02 · Read: source chips with a scanning shimmer sweeping across. */
function ReadMock() {
  const reduce = useReducedMotion();
  const sources = ["Engineering blog", "Job posting", "Candidate review", "Conference talk"];
  return (
    <div className="relative overflow-hidden p-4">
      <div className="flex flex-wrap gap-2">
        {sources.map((s) => (
          <span
            key={s}
            className="border-border/60 bg-muted/30 text-foreground flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs">
            <span className="bg-primary inline-block h-1.5 w-1.5 rounded-full" />
            {s}
          </span>
        ))}
      </div>
      {!reduce && (
        <motion.div
          className="via-primary/20 absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent to-transparent"
          animate={{ x: ["-40%", "340%"] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}

/** 03 · Scope: round + section toggles, the switched-off ones struck through. */
function ScopeMock() {
  const chips = [
    { label: "Coding", on: true },
    { label: "System Design", on: true },
    { label: "Behavioral", on: false },
    { label: "Company", on: true },
    { label: "Interview loop", on: false },
    { label: "Skills", on: true },
  ];
  return (
    <div className="flex flex-wrap gap-2 p-4">
      {chips.map((c) => (
        <span
          key={c.label}
          className={`font-display rounded-full border px-3 py-1.5 text-xs font-medium ${
            c.on
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-muted/40 text-muted-foreground/60 line-through"
          }`}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

/** 04 · Effort: Low/Med/High bars whose widths ease in on view. */
function EffortMock() {
  const reduce = useReducedMotion();
  const rows = [
    { label: "Low", width: "34%", meta: "3–5 queries · 8–15 Q" },
    { label: "Medium", width: "62%", meta: "4–8 queries · 15–30 Q" },
    { label: "High", width: "100%", meta: "8–12 queries · 30–50 Q" },
  ];
  return (
    <div className="space-y-3 p-4">
      {rows.map((r, i) => (
        <div key={r.label}>
          <div className="mb-1.5 flex justify-between text-[11px]">
            <span className="text-foreground font-medium">{r.label}</span>
            <span className="text-muted-foreground">{r.meta}</span>
          </div>
          <div className="bg-brand-100 h-2 overflow-hidden rounded-full">
            <motion.div
              className="bg-primary h-full rounded-full"
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
  );
}

/** 05 · Evidence: a question row with its confidence and source links. */
function EvidenceMock() {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-status-good bg-status-good/10 rounded-full px-2.5 py-1 text-xs font-semibold">
          High
        </span>
        <span className="text-muted-foreground text-xs">2 sources</span>
      </div>
      <p className="font-display text-foreground mt-4 text-base leading-snug font-semibold">
        How do you guarantee idempotency on the payments API?
      </p>
      <div className="border-border/60 mt-4 space-y-2 border-t pt-3">
        {["Stripe Engineering blog", "Interview review · levels.fyi"].map((s) => (
          <div key={s} className="text-primary flex items-center gap-1.5 text-xs font-medium">
            <Link2 className="h-3.5 w-3.5 shrink-0" />
            <span>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Index-matched to `copy.agent.tiles` — keep the two arrays in sync. */
const STEPS = [
  { Icon: Route, mock: <PlanMock /> },
  { Icon: Globe, mock: <ReadMock /> },
  { Icon: SlidersHorizontal, mock: <ScopeMock /> },
  { Icon: Gauge, mock: <EffortMock /> },
  { Icon: ShieldCheck, mock: <EvidenceMock /> },
];

export function HowAgentWorksSection() {
  const { agent } = siteConfig.copy;
  const grid = agent.tiles.slice(0, 4);
  const hero = agent.tiles[4];

  return (
    <section id="how-agent-works" className="mx-auto w-full max-w-6xl px-6 py-24 md:px-8">
      <div className="mb-14 text-center">
        <p className="text-tertiary mb-3 text-xs font-semibold tracking-[0.25em] uppercase">
          {agent.eyebrow}
        </p>
        <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {agent.title}
        </h2>
        <p className="font-display text-muted-foreground mx-auto mt-4 max-w-2xl text-lg leading-relaxed">
          {agent.sub}
        </p>
      </div>

      {/* Four steps in a 2×2, then the payoff step across the full width. */}
      <div className="grid gap-6 md:grid-cols-2">
        {grid.map((tile, i) => (
          <Step
            key={tile.name}
            index={i}
            Icon={STEPS[i].Icon}
            name={tile.name}
            description={tile.description}
            mock={STEPS[i].mock}
          />
        ))}
      </div>

      <div className="mt-6">
        <Step
          index={4}
          Icon={STEPS[4].Icon}
          name={hero.name}
          description={hero.description}
          mock={STEPS[4].mock}
          wide
        />
      </div>
    </section>
  );
}
