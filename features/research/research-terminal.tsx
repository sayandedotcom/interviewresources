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
 * dark in both themes — it is a terminal, not a card.
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
          isError ? "text-destructive" : latest ? "text-tertiary" : "text-neutral-600"
        }`}
        aria-hidden="true"
      />
      <span
        className={`w-16 shrink-0 tracking-widest ${
          isError ? "text-destructive" : latest ? "text-tertiary" : "text-neutral-600"
        }`}>
        {line.stage}
      </span>
      <span
        className={isError ? "text-destructive" : latest ? "text-neutral-200" : "text-neutral-500"}>
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
  /** The company being scouted; the header names the session after it. */
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
    <div className="overflow-hidden rounded-xl bg-neutral-950 font-mono text-xs text-neutral-300 ring-1 ring-neutral-800">
      <div className="flex items-center gap-2 border-b border-neutral-800 px-4 py-2.5">
        <Terminal className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
        <span className="text-[11px] text-neutral-500">interview-scout · {session}</span>
        <span className="ml-auto text-[11px] text-neutral-600">
          {formatElapsed(elapsed)} elapsed
        </span>
      </div>

      <div ref={bodyRef} className="h-64 overflow-y-auto p-3 sm:h-72" aria-live="polite">
        <ul className="space-y-1">
          {lines.map((line, i) => (
            <LogLine key={line.id} line={line} latest={i === lines.length - 1} failed={failed} />
          ))}
          {lines.length === 0 && <li className="px-2 py-1 text-neutral-500">establishing feed…</li>}
        </ul>
        {!failed && (
          <span
            className="mt-1 ml-2 inline-block h-3.5 w-2 animate-pulse bg-neutral-400"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-neutral-800 px-4 py-2 text-[11px] text-neutral-600">
        <span className="truncate">metered · charged what the run spends</span>
        <span className="flex shrink-0 items-center gap-1.5">
          {TRACKED_STAGES.map((stage, i) => (
            <span key={stage} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">·</span>}
              <span
                className={
                  i < currentIdx
                    ? "text-neutral-500"
                    : i === currentIdx
                      ? "text-tertiary"
                      : "text-neutral-700"
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
