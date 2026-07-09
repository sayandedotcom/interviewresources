import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { tavilyExtract, tavilyExtractCredits, tavilySearch, tavilySearchCredits } from "./tavily";

/**
 * The credit functions decide what the BudgetTracker bills, which decides what
 * the user is charged. The fetch wrappers matter mainly for their failure
 * modes: a swallowed Tavily error would leave the pipeline synthesizing a
 * report from nothing.
 */

function mockFetch(response: Partial<Response> & { json?: () => unknown }) {
  const fn = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => "",
    json: async () => ({}),
    ...response,
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("tavilySearchCredits", () => {
  it("bills one credit for basic and two for advanced", () => {
    expect(tavilySearchCredits("basic")).toBe(1);
    expect(tavilySearchCredits("advanced")).toBe(2);
  });
});

describe("tavilyExtractCredits", () => {
  it("bills one credit per five urls", () => {
    expect(tavilyExtractCredits(1)).toBe(1);
    expect(tavilyExtractCredits(5)).toBe(1);
    expect(tavilyExtractCredits(6)).toBe(2);
    expect(tavilyExtractCredits(10)).toBe(2);
    expect(tavilyExtractCredits(11)).toBe(3);
  });

  it("bills a credit for zero urls, so callers must not call it on an empty list", () => {
    // `Math.max(1, ...)` floors at one. The pipeline guards with `length > 0`;
    // this test pins the trap so nobody removes that guard.
    expect(tavilyExtractCredits(0)).toBe(1);
  });
});

describe("tavilySearch", () => {
  it("sends the query, depth, and bearer token", async () => {
    const fetchMock = mockFetch({ json: async () => ({ query: "q", results: [] }) });

    await tavilySearch("stripe interview process", { depth: "advanced", maxResults: 3 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.tavily.com/search");
    expect(init.headers.authorization).toBe("Bearer tvly-test");
    expect(JSON.parse(init.body)).toEqual({
      query: "stripe interview process",
      search_depth: "advanced",
      max_results: 3,
    });
  });

  it("defaults to basic depth and five results", async () => {
    const fetchMock = mockFetch({ json: async () => ({ query: "q", results: [] }) });

    await tavilySearch("q");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.search_depth).toBe("basic");
    expect(body.max_results).toBe(5);
  });

  it("throws on a non-2xx response, surfacing the status and body", async () => {
    mockFetch({ ok: false, status: 429, text: async () => "rate limited" });

    await expect(tavilySearch("q")).rejects.toThrow(/Tavily search failed \(429\): rate limited/);
  });
});

describe("tavilyExtract", () => {
  it("short-circuits on an empty url list without calling the API", async () => {
    const fetchMock = mockFetch({});

    await expect(tavilyExtract([])).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps Tavily's snake_case raw_content onto rawContent", async () => {
    mockFetch({
      json: async () => ({ results: [{ url: "https://a.dev", raw_content: "hello" }] }),
    });

    await expect(tavilyExtract(["https://a.dev"])).resolves.toEqual([
      { url: "https://a.dev", rawContent: "hello" },
    ]);
  });

  it("tolerates a response with no results key", async () => {
    mockFetch({ json: async () => ({}) });

    await expect(tavilyExtract(["https://a.dev"])).resolves.toEqual([]);
  });

  it("throws on a non-2xx response", async () => {
    mockFetch({ ok: false, status: 500, text: async () => "boom" });

    await expect(tavilyExtract(["https://a.dev"])).rejects.toThrow(/Tavily extract failed \(500\)/);
  });
});
