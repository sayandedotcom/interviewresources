import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import type { z } from "zod";
import { BudgetTracker, type GeminiModel } from "./budget";

/**
 * Thin wrapper around the Vercel AI SDK's Google provider (PRD tech-stack
 * decision: AI SDK is the default interface; drop to `@google/genai`
 * directly only if a specific stage needs a provider feature the adapter
 * doesn't expose yet — see conversation decision on AI SDK vs @google/genai).
 *
 * Every call records its real token usage into the shared BudgetTracker so
 * the $1 cap in PRD §7 is enforced from measured cost, not estimates.
 */
export async function generateStructured<T>(opts: {
  model: GeminiModel;
  stage: string;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  budget: BudgetTracker;
}): Promise<T> {
  const { object, usage } = await generateObject({
    model: google(opts.model),
    schema: opts.schema,
    system: opts.system,
    prompt: opts.prompt,
  });

  opts.budget.recordLlmCall(
    opts.stage,
    opts.model,
    usage.inputTokens ?? 0,
    usage.outputTokens ?? 0,
  );

  return object;
}
