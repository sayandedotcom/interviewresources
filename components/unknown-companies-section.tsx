"use client";

import { siteConfig } from "@/site";
import { Building2, ClipboardList, Search, Sparkles, TrendingUp, Users, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Section, SectionHeader } from "@/components/sections/section";

/** Icons for the four proxy signals, in the order the copy declares them. */
const SIGNAL_ICONS = [Users, TrendingUp, Building2, ClipboardList] as const;

/**
 * The moment a run comes up empty: three lookups that find nothing, the count
 * falling short of the threshold, and the broaden line firing. Amber rather
 * than the brand hue — this beat is the problem, not the answer.
 *
 * Reveals in sequence so the shortfall reads as something happening rather than
 * a screenshot of a failure. The card grid picks the sequence up where this
 * leaves off, so the two halves read as cause and effect.
 */
function ThinEvidencePanel() {
  const reduce = useReducedMotion();
  const { panel } = siteConfig.copy.unknownCompanies;

  return (
    <div className="silver-edge rounded-3xl bg-gradient-to-b from-amber-100/80 to-amber-50/30 p-5 shadow-[var(--shadow-sm)] sm:p-6">
      <div className="border-border/50 bg-background rounded-2xl border p-4 shadow-[var(--shadow-md)]">
        <div className="border-border/60 bg-muted/40 flex items-center gap-2 rounded-lg border px-3 py-2">
          <Search className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          <span className="truncate text-xs text-amber-700">{panel.query}</span>
        </div>

        <p className="text-muted-foreground mt-4 text-[10px] font-semibold tracking-[0.18em] uppercase">
          {panel.label}
        </p>

        <div className="divide-border/60 mt-1 divide-y">
          {panel.rows.map((row, i) => (
            <motion.div
              key={row.source}
              initial={reduce ? false : { opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.12 * i, duration: 0.4 }}
              className="flex items-center gap-2.5 py-2.5">
              <X className="text-muted-foreground/50 h-3.5 w-3.5 shrink-0" />
              <span className="font-display text-foreground/70 text-sm">{row.source}</span>
              <span className="text-muted-foreground/60 ml-auto text-xs">{row.result}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.12 * panel.rows.length, duration: 0.4 }}
          className="border-border/60 mt-3 flex items-baseline gap-2.5 border-t pt-3">
          <span className="font-display shrink-0 text-2xl font-semibold tracking-tight tabular-nums">
            {panel.threshold}
          </span>
          <span className="font-display text-muted-foreground text-xs leading-tight">
            {panel.thresholdLabel}
          </span>
          <span className="ml-auto shrink-0 self-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            {panel.thresholdTag}
          </span>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.12 * panel.rows.length + 0.25, duration: 0.4 }}
          className="mt-3 flex items-start gap-2.5 rounded-lg bg-amber-50/70 px-3 py-2.5">
          <Sparkles className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span className="text-[11px] leading-relaxed text-amber-800">{panel.broaden}</span>
        </motion.div>
      </div>
    </div>
  );
}

/**
 * What the agent looks for once direct evidence runs out. Deliberately
 * single-hue: these are four parts of one fallback pass, so the numerals tell
 * them apart and colour is used only for depth.
 */
function SignalCard({
  index,
  name,
  body,
  delay,
}: {
  index: number;
  name: string;
  body: string;
  delay: number;
}) {
  const reduce = useReducedMotion();
  const Icon = SIGNAL_ICONS[index];

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.45 }}
      className="silver-edge from-brand-100/90 to-brand-50/30 rounded-3xl bg-gradient-to-b p-5 shadow-[var(--shadow-sm)] sm:p-6">
      <div className="flex items-center gap-3">
        <span className="bg-brand-100 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <Icon className="text-primary h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className="text-primary text-xs font-semibold tracking-[0.2em] tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <h3 className="font-display mt-4 text-lg font-semibold tracking-tight">{name}</h3>
      <p className="font-display text-muted-foreground mt-2 text-base leading-relaxed">{body}</p>
    </motion.div>
  );
}

/**
 * Answers the question that stops early-stage candidates from buying: "there's
 * nothing public about this company, so what could you possibly find?" The
 * pipeline already handles it (lib/research/sparsity.ts decides,
 * proxyPlanStage runs the second wave) — this section just makes it visible.
 */
export function UnknownCompaniesSection() {
  const { unknownCompanies } = siteConfig.copy;
  // Picks up where the panel's reveal ends, so the cards read as its consequence.
  const cardsStart = 0.12 * unknownCompanies.panel.rows.length + 0.45;

  return (
    <Section tone="wash">
      <SectionHeader
        eyebrow={unknownCompanies.eyebrow}
        title={unknownCompanies.title}
        sub={unknownCompanies.sub}
      />

      <div className="grid items-start gap-6 md:grid-cols-5">
        <div className="md:col-span-2">
          <ThinEvidencePanel />
        </div>

        <div className="md:col-span-3">
          <p className="font-display text-muted-foreground mb-4 text-sm font-medium">
            {unknownCompanies.signalsLabel}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {unknownCompanies.signals.map((signal, i) => (
              <SignalCard
                key={signal.name}
                index={i}
                name={signal.name}
                body={signal.body}
                delay={cardsStart + 0.1 * i}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="font-display text-muted-foreground mx-auto mt-12 max-w-3xl text-center text-base leading-relaxed">
        {unknownCompanies.closer}
      </p>
    </Section>
  );
}
