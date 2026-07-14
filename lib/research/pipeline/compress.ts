import { z } from "zod";

import type { BudgetTracker } from "../budget";
import { generateStructured } from "../gemini";
import type { CompressedNote, GatheredSource } from "../types";
import { type OnProgress, emit, mapChunked } from "./shared";

const COMPRESS_CONCURRENCY = 5;

/** Stage 3 — Compress. Cheap model turns raw sources into dense evidence notes. */
const compressedNoteSchema = z.object({
  summary: z.string().describe("Dense summary, ~150-300 tokens, preserving concrete facts"),
});

export async function compressStage(
  sources: GatheredSource[],
  budget: BudgetTracker,
  onProgress: OnProgress
): Promise<CompressedNote[]> {
  const usable = sources.filter((s) => s.content && s.content.length >= 40);

  // Notes keep the original source order (slot per source) so the synthesize
  // evidence block is stable regardless of which compress call finishes first.
  const slots: (CompressedNote | undefined)[] = new Array(usable.length);
  const toCompress: { source: GatheredSource; index: number }[] = [];

  const noteFrom = (source: GatheredSource, summary: string): CompressedNote => ({
    sourceUrl: source.url,
    sourceTitle: source.title,
    category: source.category,
    summary,
  });

  usable.forEach((source, index) => {
    if (source.extracted) {
      toCompress.push({ source, index });
    } else {
      // A search snippet is already shorter than the summary we would ask for;
      // "compressing" it costs a call and loses detail. Pass it through as-is.
      slots[index] = noteFrom(source, source.content);
    }
  });

  await mapChunked(
    toCompress,
    COMPRESS_CONCURRENCY,
    () => budget.shouldStop(),
    async ({ source, index }) => {
      emit(onProgress, "compress", `Summarizing: ${source.title || source.url}`);
      try {
        const { summary } = await generateStructured({
          model: "gemini-3.1-flash-lite-preview",
          stage: "compress",
          schema: compressedNoteSchema,
          budget,
          system: `Summarize the given web page content into a dense note for an interview-prep
researcher. Keep concrete, checkable facts: specific questions mentioned, technologies
named, round structure, difficulty signals, dates. Drop filler. Do not editorialize.`,
          prompt: `Source: ${source.title}\nURL: ${source.url}\nCategory: ${source.category}\n\nContent:\n${source.content.slice(0, 6000)}`,
        });
        slots[index] = noteFrom(source, summary);
      } catch {
        // Degraded but grounded: the page's opening beats dropping the source.
        slots[index] = noteFrom(source, source.content.slice(0, 1500));
      }
    }
  );

  return slots.filter((n): n is CompressedNote => n !== undefined);
}
