/**
 * Direct Tavily REST client — no MCP indirection (PRD §8.4). Keeping this
 * as raw fetch calls means the BudgetTracker knows the exact credit cost of
 * every call before it's made.
 */
import { env } from "@/env";

const TAVILY_API_BASE = "https://api.tavily.com";

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  favicon?: string;
}

export interface TavilySearchResponse {
  query: string;
  results: TavilySearchResult[];
}

export async function tavilySearch(
  query: string,
  opts: { depth: "basic" | "advanced"; maxResults?: number } = { depth: "basic" }
): Promise<TavilySearchResponse> {
  const apiKey = requireApiKey();
  const res = await fetch(`${TAVILY_API_BASE}/search`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      query,
      search_depth: opts.depth,
      max_results: opts.maxResults ?? 5,
      include_favicon: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Tavily search failed (${res.status}): ${await res.text()}`);
  }

  return res.json();
}

export interface TavilyExtractResult {
  url: string;
  rawContent: string;
}

export async function tavilyExtract(urls: string[]): Promise<TavilyExtractResult[]> {
  if (urls.length === 0) return [];
  const apiKey = requireApiKey();
  const res = await fetch(`${TAVILY_API_BASE}/extract`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ urls }),
  });

  if (!res.ok) {
    throw new Error(`Tavily extract failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  return (data.results ?? []).map((r: { url: string; raw_content: string }) => ({
    url: r.url,
    rawContent: r.raw_content,
  }));
}

/** Tavily credit cost per call, per PRD §7 (basic=1, advanced=2, extract=1 per 5 URLs). */
export function tavilySearchCredits(depth: "basic" | "advanced"): number {
  return depth === "advanced" ? 2 : 1;
}

export function tavilyExtractCredits(urlCount: number): number {
  return Math.ceil(Math.max(0, urlCount) / 5);
}

function requireApiKey(): string {
  const key = env.TAVILY_API_KEY;
  if (!key) {
    throw new Error("TAVILY_API_KEY is not set — copy .env.example to .env.local and fill it in.");
  }
  return key;
}
