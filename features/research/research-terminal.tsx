"use client";

import { useEffect, useRef, useState } from "react";

import {
  AlertTriangle,
  Brain,
  Check,
  Compass,
  Layers,
  type LucideIcon,
  Radar,
  Search,
  Terminal,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import type { PipelineProgressEvent } from "@/lib/research/types";

/**
 * The live-run terminal: the landing page's How-it-works mock made real, so the
 * run a user paid for looks like the one the marketing promised. Deliberately
 * Light in both themes so the live run feels integrated with the research
 * workspace rather than introducing a separate dark surface.
 */

export interface TerminalLine extends PipelineProgressEvent {
  id: number;
}

const STAGE_ICON: Record<PipelineProgressEvent["stage"], LucideIcon> = {
  plan: Compass,
  gather: Search,
  broaden: Radar,
  compress: Layers,
  synthesize: Brain,
  done: Check,
  error: AlertTriangle,
};

/** The footer tracker shows the paid pipeline stages; broaden folds into gather. */
const TRACKED_STAGES = ["plan", "gather", "compress", "synthesize"] as const;

function trackerStage(stage: PipelineProgressEvent["stage"]): (typeof TRACKED_STAGES)[number] {
  if (stage === "broaden") return "gather";
  if (stage === "done" || stage === "error") return "synthesize";
  return stage;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function LogLine({
  line,
  latest,
  failed,
}: {
  line: TerminalLine;
  latest: boolean;
  failed: boolean;
}) {
  const reduce = useReducedMotion();
  const Icon = STAGE_ICON[line.stage];
  const isError = line.stage === "error";

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex items-center gap-2.5 rounded px-2 py-1 ${
        latest && !isError ? "bg-tertiary/10" : ""
      }`}>
      <Icon
        className={`h-3.5 w-3.5 shrink-0 ${
          isError ? "text-destructive" : latest ? "text-tertiary" : "text-muted-foreground"
        }`}
        aria-hidden="true"
      />
      <span
        className={`w-16 shrink-0 tracking-widest ${
          isError ? "text-destructive" : latest ? "text-tertiary" : "text-muted-foreground"
        }`}>
        {line.stage}
      </span>
      <span
        className={
          isError ? "text-destructive" : latest ? "text-foreground" : "text-muted-foreground"
        }>
        {line.message}
      </span>
      {latest && !isError && !failed && (
        <span
          className="bg-tertiary ml-auto h-1.5 w-1.5 shrink-0 animate-pulse rounded-full"
          aria-hidden="true"
        />
      )}
    </motion.li>
  );
}

export function ResearchTerminal({
  lines,
  company,
  failed = false,
}: {
  lines: TerminalLine[];
  /** The company being gathered on; the header names the session after it. */
  company: string;
  /** Freezes the clock and the cursor once the run has failed. */
  failed?: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (failed) return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [failed]);

  // Keep the newest line in view as the stream grows past the viewport.
  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [lines.length]);

  const session = company.trim().toLowerCase() || "research";
  const current = trackerStage(lines.at(-1)?.stage ?? "plan");
  const currentIdx = TRACKED_STAGES.indexOf(current);

  return (
    <div className="bg-background text-foreground ring-border flex h-[calc(100dvh-10rem)] min-h-[28rem] flex-col overflow-hidden rounded-xl font-mono text-xs ring-1">
      <div className="border-border flex items-center gap-2 border-b px-4 py-2.5">
        <Terminal className="text-muted-foreground h-3.5 w-3.5" aria-hidden="true" />
        <span className="text-muted-foreground text-[11px]">interview-resources · {session}</span>
        <span className="text-muted-foreground/70 ml-auto text-[11px]">
          {formatElapsed(elapsed)} elapsed
        </span>
      </div>

      <div ref={bodyRef} className="flex-1 overflow-y-auto p-3" aria-live="polite">
        <ul className="space-y-1">
          {lines.map((line, i) => (
            <LogLine key={line.id} line={line} latest={i === lines.length - 1} failed={failed} />
          ))}
          {lines.length === 0 && (
            <li className="text-muted-foreground px-2 py-1">establishing feed…</li>
          )}
        </ul>
        {!failed && (
          <span
            className="bg-muted-foreground mt-1 ml-2 inline-block h-3.5 w-2 animate-pulse"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="border-border text-muted-foreground/70 flex items-center justify-between gap-3 border-t px-4 py-2 text-[11px]">
        <span className="truncate">metered · charged what the run spends</span>
        <span className="flex shrink-0 items-center gap-1.5">
          {TRACKED_STAGES.map((stage, i) => (
            <span key={stage} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">·</span>}
              <span
                className={
                  i < currentIdx
                    ? "text-muted-foreground"
                    : i === currentIdx
                      ? "text-tertiary"
                      : "text-muted-foreground/50"
                }>
                {i < currentIdx && (
                  <Check className="mr-0.5 inline h-3 w-3 align-[-2px]" aria-hidden="true" />
                )}
                {stage}
              </span>
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
