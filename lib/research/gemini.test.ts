import { google } from "@ai-sdk/google";
import { NoObjectGeneratedError, generateObject } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { BudgetTracker } from "./budget";
import { ResearchStructuredOutputError, generateStructured } from "./gemini";

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn((model: string) => model),
}));

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, generateObject: vi.fn() };
});

const generateObjectMock = vi.mocked(generateObject);
const googleMock = vi.mocked(google);

function usage(inputTokens = 100, outputTokens = 50) {
  return {
    inputTokens,
    inputTokenDetails: {
      noCacheTokens: inputTokens,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    },
    outputTokens,
    outputTokenDetails: { textTokens: outputTokens, reasoningTokens: 0 },
    totalTokens: inputTokens + outputTokens,
  };
}

function response(id: string) {
  return {
    id,
    timestamp: new Date("2026-07-27T00:00:00.000Z"),
    modelId: "gemini-3.1-flash-lite",
  };
}

function malformedOutput(text = '{"queries": [') {
  return new NoObjectGeneratedError({
    message: "No object generated: could not parse the response.",
    cause: new SyntaxError("Unexpected end of JSON input"),
    text,
    response: response("bad-response"),
    usage: usage(),
    finishReason: "length",
  });
}

function options(budget = new BudgetTracker(1)) {
  return {
    model: "gemini-3.1-flash-lite" as const,
    stage: "plan",
    schema: z.object({ ok: z.boolean() }),
    system: "private system instructions",
    prompt: "private candidate and job description",
    budget,
    maxOutputTokens: 1_024,
  };
}

beforeEach(() => {
  generateObjectMock.mockReset();
  googleMock.mockClear();
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generateStructured", () => {
  it("returns a valid object and records its measured usage", async () => {
    const budget = new BudgetTracker(1);
    generateObjectMock.mockResolvedValue({
      object: { ok: true },
      usage: usage(120, 30),
      finishReason: "stop",
      response: response("good-response"),
    } as never);

    await expect(generateStructured(options(budget))).resolves.toEqual({ ok: true });

    expect(generateObjectMock).toHaveBeenCalledOnce();
    expect(googleMock).toHaveBeenCalledWith("gemini-3.1-flash-lite");
    expect(budget.breakdown()).toHaveLength(1);
    expect(budget.breakdown()[0].detail).toContain("120in/30out");
  });

  it("forwards an explicit Gemini thinking level without exposing thoughts", async () => {
    generateObjectMock.mockResolvedValue({
      object: { ok: true },
      usage: usage(),
      finishReason: "stop",
      response: response("good-response"),
    } as never);

    await generateStructured({ ...options(), thinkingLevel: "low" });

    expect(generateObjectMock.mock.calls[0][0]).toMatchObject({
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: "low",
            includeThoughts: false,
          },
        },
      },
    });
  });

  it("bills malformed output and retries once with stricter instructions", async () => {
    const budget = new BudgetTracker(1);
    generateObjectMock.mockRejectedValueOnce(malformedOutput()).mockResolvedValueOnce({
      object: { ok: true },
      usage: usage(90, 20),
      finishReason: "stop",
      response: response("retry-response"),
    } as never);

    await expect(generateStructured(options(budget))).resolves.toEqual({ ok: true });

    expect(generateObjectMock).toHaveBeenCalledTimes(2);
    expect(generateObjectMock.mock.calls[1][0]).toMatchObject({ temperature: 0 });
    expect(generateObjectMock.mock.calls[1][0].system).toContain("structured-output retry");
    expect(budget.breakdown()).toHaveLength(2);
  });

  it("logs parse diagnostics and throws a correlated error after both attempts fail", async () => {
    const output = 'not-json containing "diagnostic detail"';
    generateObjectMock.mockRejectedValue(malformedOutput(output));

    const promise = generateStructured(options());
    await expect(promise).rejects.toBeInstanceOf(ResearchStructuredOutputError);
    await expect(promise).rejects.toThrow(
      /Research stage "plan".*after 2 attempts.*diagnostic plan-[a-f0-9]{12}/
    );

    const errorLines = vi
      .mocked(console.error)
      .mock.calls.map(([line]) => String(line))
      .filter((line) => line.startsWith("[research:llm]"));
    expect(errorLines).toHaveLength(2);
    expect(errorLines[0]).toContain('"finishReason":"length"');
    expect(errorLines[0]).toContain('"causeName":"SyntaxError"');
    expect(errorLines[0]).toContain('"outputPreview":"not-json containing');
    expect(errorLines.join("\n")).not.toContain("private candidate and job description");
  });

  it("does not retry provider failures that are unrelated to structured output", async () => {
    generateObjectMock.mockRejectedValue(new Error("Gemini 503"));

    await expect(generateStructured(options())).rejects.toThrow("Gemini 503");
    expect(generateObjectMock).toHaveBeenCalledOnce();
  });
});
