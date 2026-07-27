import { google } from "@ai-sdk/google";
import { NoObjectGeneratedError, generateObject } from "ai";
import { randomUUID } from "node:crypto";
import type { z } from "zod";

import { type BudgetReservation, BudgetTracker, type GeminiModel } from "./budget";

const STRUCTURED_OUTPUT_ATTEMPTS = 2;
const OUTPUT_PREVIEW_LIMIT = 6_000;
const LOG_PREFIX = "[research:llm]";

const RETRY_INSTRUCTION = `This is a structured-output retry. Return exactly one complete JSON
object matching the supplied schema. Do not add markdown fences, commentary, or fields outside
the schema. Keep strings concise so the entire object finishes within the output limit.`;

type GenerateStructuredOptions<T> = {
  model: GeminiModel;
  stage: string;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  budget: BudgetTracker;
  maxOutputTokens: number;
  thinkingLevel?: "minimal" | "low" | "medium" | "high";
};

export class ResearchStructuredOutputError extends Error {
  constructor(
    readonly stage: string,
    readonly diagnosticId: string,
    readonly attempts: number,
    cause: unknown
  ) {
    super(
      `Research stage "${stage}" returned malformed structured output after ${attempts} ` +
        `attempt${attempts === 1 ? "" : "s"} (diagnostic ${diagnosticId}). ` +
        `Check the server console for ${LOG_PREFIX}.`,
      { cause }
    );
    this.name = "ResearchStructuredOutputError";
  }
}

function debugLoggingEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.RESEARCH_DEBUG === "1";
}

function writeLog(
  level: "info" | "error",
  event: Record<string, unknown>,
  debugOnly = false
): void {
  if (debugOnly && !debugLoggingEnabled()) return;
  const line = `${LOG_PREFIX} ${JSON.stringify({
    at: new Date().toISOString(),
    ...event,
  })}`;
  if (level === "error") console.error(line);
  else console.info(line);
}

function errorMetadata(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return { errorName: typeof error, errorMessage: String(error) };
  }

  const cause = error.cause;
  return {
    errorName: error.name,
    errorMessage: error.message,
    ...(cause instanceof Error
      ? { causeName: cause.name, causeMessage: cause.message }
      : cause == null
        ? {}
        : { causeMessage: String(cause) }),
  };
}

function logFailure(opts: {
  error: unknown;
  diagnosticId: string;
  stage: string;
  model: GeminiModel;
  attempt: number;
  durationMs: number;
}): void {
  const structuredError = NoObjectGeneratedError.isInstance(opts.error) ? opts.error : undefined;
  const rawText = structuredError?.text;
  const includeOutput = debugLoggingEnabled() && rawText !== undefined;

  writeLog("error", {
    event: "structured_output_failure",
    diagnosticId: opts.diagnosticId,
    stage: opts.stage,
    model: opts.model,
    attempt: opts.attempt,
    maxAttempts: STRUCTURED_OUTPUT_ATTEMPTS,
    durationMs: opts.durationMs,
    retryable: structuredError !== undefined,
    ...errorMetadata(opts.error),
    ...(structuredError
      ? {
          finishReason: structuredError.finishReason,
          responseId: structuredError.response?.id,
          responseModel: structuredError.response?.modelId,
          inputTokens: structuredError.usage?.inputTokens,
          outputTokens: structuredError.usage?.outputTokens,
          outputCharacters: rawText?.length ?? 0,
        }
      : {}),
    ...(includeOutput
      ? {
          outputPreview: rawText.slice(0, OUTPUT_PREVIEW_LIMIT),
          outputPreviewTruncated: rawText.length > OUTPUT_PREVIEW_LIMIT,
        }
      : {}),
  });
}

function settleFailedCall(
  opts: GenerateStructuredOptions<unknown>,
  reservation: BudgetReservation,
  error: unknown
): void {
  if (NoObjectGeneratedError.isInstance(error) && error.usage) {
    opts.budget.commitLlmCall(
      reservation,
      opts.model,
      error.usage.inputTokens ?? 0,
      error.usage.outputTokens ?? 0
    );
    return;
  }
  opts.budget.cancelReservation(reservation);
}

/**
 * Thin wrapper around the Vercel AI SDK's Google provider (PRD tech-stack
 * decision: AI SDK is the default interface; drop to `@google/genai`
 * directly only if a specific stage needs a provider feature the adapter
 * doesn't expose yet — see conversation decision on AI SDK vs @google/genai).
 *
 * Every call records its real token usage into the shared BudgetTracker so
 * the $1 cap in PRD §7 is enforced from measured cost, not estimates.
 */
export async function generateStructured<T>(opts: GenerateStructuredOptions<T>): Promise<T> {
  const diagnosticId = `${opts.stage}-${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  let lastStructuredError: unknown;

  for (let attempt = 1; attempt <= STRUCTURED_OUTPUT_ATTEMPTS; attempt += 1) {
    const system = attempt === 1 ? opts.system : `${opts.system}\n\n${RETRY_INSTRUCTION}`;
    let allocation;
    try {
      allocation = opts.budget.reserveLlmCall({
        stage: opts.stage,
        model: opts.model,
        promptBytes: Buffer.byteLength(`${system}\n${opts.prompt}`, "utf8"),
        requestedMaxOutputTokens: opts.maxOutputTokens,
      });
    } catch (error) {
      if (lastStructuredError !== undefined) {
        writeLog("error", {
          event: "structured_output_retry_unavailable",
          diagnosticId,
          stage: opts.stage,
          model: opts.model,
          completedAttempts: attempt - 1,
          ...errorMetadata(error),
        });
        throw new ResearchStructuredOutputError(
          opts.stage,
          diagnosticId,
          attempt - 1,
          lastStructuredError
        );
      }
      throw error;
    }

    const { reservation, maxOutputTokens } = allocation;
    const startedAt = Date.now();
    writeLog(
      "info",
      {
        event: "structured_output_start",
        diagnosticId,
        stage: opts.stage,
        model: opts.model,
        attempt,
        maxAttempts: STRUCTURED_OUTPUT_ATTEMPTS,
        maxOutputTokens,
        thinkingLevel: opts.thinkingLevel,
        promptBytes: Buffer.byteLength(`${system}\n${opts.prompt}`, "utf8"),
      },
      true
    );

    try {
      const result = await generateObject({
        model: google(opts.model),
        schema: opts.schema,
        schemaName: `research_${opts.stage.replaceAll(/[^a-zA-Z0-9_]/g, "_")}`,
        system,
        prompt: opts.prompt,
        maxOutputTokens,
        ...(opts.thinkingLevel
          ? {
              providerOptions: {
                google: {
                  thinkingConfig: {
                    thinkingLevel: opts.thinkingLevel,
                    includeThoughts: false,
                  },
                },
              },
            }
          : {}),
        ...(attempt > 1 ? { temperature: 0 } : {}),
      });

      opts.budget.commitLlmCall(
        reservation,
        opts.model,
        result.usage.inputTokens ?? 0,
        result.usage.outputTokens ?? 0
      );
      writeLog(
        "info",
        {
          event: "structured_output_success",
          diagnosticId,
          stage: opts.stage,
          model: opts.model,
          attempt,
          durationMs: Date.now() - startedAt,
          finishReason: result.finishReason,
          responseId: result.response.id,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
        },
        true
      );
      return result.object;
    } catch (error) {
      logFailure({
        error,
        diagnosticId,
        stage: opts.stage,
        model: opts.model,
        attempt,
        durationMs: Date.now() - startedAt,
      });
      settleFailedCall(opts, reservation, error);

      if (!NoObjectGeneratedError.isInstance(error)) throw error;
      lastStructuredError = error;
      if (attempt === STRUCTURED_OUTPUT_ATTEMPTS) {
        throw new ResearchStructuredOutputError(opts.stage, diagnosticId, attempt, error);
      }

      writeLog("info", {
        event: "structured_output_retry",
        diagnosticId,
        stage: opts.stage,
        model: opts.model,
        nextAttempt: attempt + 1,
      });
    }
  }

  throw new Error("Structured-output retry loop exited unexpectedly.");
}
