import { describe, expect, it } from "vitest";

import {
  canonicalizePublicUrl,
  mergeResearchResources,
  normalizeFaviconUrl,
  rankResourceCandidates,
  resourceKind,
} from "./resources";
import type { ResourceCandidate, SourceProfile } from "./types";

function candidate(overrides: Partial<ResourceCandidate> = {}): ResourceCandidate {
  return {
    url: "https://example.com/post",
    title: "Acme backend interview",
    preview: "Acme backend interview questions and coding round details.",
    score: 0.8,
    queries: ["Acme backend interview"],
    purposes: ["find a first-hand interview account"],
    categories: ["interview_experience"],
    domain: "example.com",
    origin: "direct",
    access: "link_only",
    extractionOutcome: "failed",
    relevance: {
      tier: "general",
      score: 60,
      reason: "Semantically useful general preparation.",
      matchedCategories: ["dsa"],
    },
    ...overrides,
  };
}

describe("canonicalizePublicUrl", () => {
  it("removes fragments and tracking parameters while preserving functional parameters", () => {
    expect(
      canonicalizePublicUrl("https://Example.com/post/?utm_source=x&id=7&fbclid=nope#comments")
    ).toBe("https://example.com/post?id=7");
  });

  it("rejects every non-HTTP scheme and malformed URL", () => {
    expect(canonicalizePublicUrl("javascript:alert(1)")).toBeNull();
    expect(canonicalizePublicUrl("ftp://example.com/file")).toBeNull();
    expect(canonicalizePublicUrl("not a url")).toBeNull();
  });
});

describe("normalizeFaviconUrl", () => {
  it("accepts HTTPS URLs and ignores missing, malformed, and unsafe values", () => {
    expect(normalizeFaviconUrl("https://icons.example.com/favicon.ico?size=16")).toBe(
      "https://icons.example.com/favicon.ico?size=16"
    );
    expect(normalizeFaviconUrl(undefined)).toBeUndefined();
    expect(normalizeFaviconUrl("not a url")).toBeUndefined();
    expect(normalizeFaviconUrl("http://icons.example.com/favicon.ico")).toBeUndefined();
    expect(normalizeFaviconUrl("javascript:alert(1)")).toBeUndefined();
    expect(normalizeFaviconUrl({ url: "https://icons.example.com/favicon.ico" })).toBeUndefined();
  });
});

describe("rankResourceCandidates", () => {
  it("uses semantic relevance rather than matching company or role keywords", () => {
    const generic = candidate({
      url: "https://generic.dev/post",
      domain: "generic.dev",
      title: "General interview guide",
      score: 0.82,
      relevance: {
        tier: "general",
        score: 99,
        reason: "General preparation.",
        matchedCategories: ["dsa"],
      },
    });
    const specific = candidate({
      url: "https://specific.dev/post",
      domain: "specific.dev",
      score: 0.75,
      relevance: {
        tier: "exact",
        score: 70,
        reason: "Exact target evidence.",
        matchedCategories: ["dsa"],
      },
    });

    expect(rankResourceCandidates([generic, specific])[0].url).toBe(specific.url);
  });

  it("promotes domain diversity without discarding repeated-domain results", () => {
    const ranked = rankResourceCandidates([
      candidate({ url: "https://same.dev/a", domain: "same.dev", score: 0.95 }),
      candidate({ url: "https://same.dev/b", domain: "same.dev", score: 0.94 }),
      candidate({ url: "https://other.dev/a", domain: "other.dev", score: 0.9 }),
    ]);

    expect(ranked.slice(0, 2).map((item) => item.domain)).toEqual(["same.dev", "other.dev"]);
    expect(ranked).toHaveLength(3);
  });
});

describe("resourceKind", () => {
  it("uses the semantic source profile without inspecting a platform domain", () => {
    const profile = {
      resourceKind: "video",
    } as SourceProfile;

    expect(resourceKind({ profile })).toBe("video");
    expect(resourceKind({ profile: undefined })).toBe("other");
  });
});

describe("mergeResearchResources", () => {
  it("collapses canonical variants and never lets weaker access replace stronger access", () => {
    const merged = mergeResearchResources(
      [
        {
          title: "Readable",
          url: "https://example.com/post?utm_source=old",
          why: "read",
          kind: "company_engineering",
          access: "full_text",
          usedAsEvidence: true,
          categories: ["dsa"],
        },
      ],
      [
        {
          title: "Duplicate",
          url: "https://example.com/post#top",
          why: "manual",
          kind: "other",
          access: "link_only",
          usedAsEvidence: false,
          categories: ["system_design"],
        },
      ],
      20
    );

    expect(merged).toEqual([
      expect.objectContaining({
        title: "Readable",
        url: "https://example.com/post",
        access: "full_text",
        usedAsEvidence: true,
        categories: ["dsa", "system_design"],
      }),
    ]);
  });

  it("upgrades an older link-only entry when an extension reads it", () => {
    const merged = mergeResearchResources(
      [
        {
          title: "Manual",
          url: "https://example.com/post",
          why: "manual",
          kind: "other",
          access: "link_only",
          usedAsEvidence: false,
        },
      ],
      [
        {
          title: "Now readable",
          url: "https://example.com/post",
          why: "read",
          kind: "company_engineering",
          access: "search_preview",
          usedAsEvidence: true,
        },
      ],
      20
    );

    expect(merged?.[0]).toMatchObject({
      title: "Now readable",
      access: "search_preview",
      usedAsEvidence: true,
    });
  });

  it("preserves or backfills favicons independently of access precedence", () => {
    const merged = mergeResearchResources(
      [
        {
          title: "Readable",
          url: "https://example.com/kept",
          faviconUrl: "https://icons.example.com/original.ico",
          why: "read",
          kind: "company_engineering",
          access: "full_text",
          usedAsEvidence: true,
        },
        {
          title: "Also readable",
          url: "https://example.com/backfilled",
          why: "read",
          kind: "company_engineering",
          access: "full_text",
          usedAsEvidence: true,
        },
      ],
      [
        {
          title: "Weaker duplicate",
          url: "https://example.com/kept#details",
          faviconUrl: "https://icons.example.com/replacement.ico",
          why: "manual",
          kind: "other",
          access: "link_only",
          usedAsEvidence: false,
        },
        {
          title: "Weaker duplicate",
          url: "https://example.com/backfilled?utm_source=new",
          faviconUrl: "https://icons.example.com/backfill.ico",
          why: "manual",
          kind: "other",
          access: "link_only",
          usedAsEvidence: false,
        },
      ],
      20
    );

    expect(merged).toEqual([
      expect.objectContaining({
        url: "https://example.com/kept",
        access: "full_text",
        faviconUrl: "https://icons.example.com/original.ico",
      }),
      expect.objectContaining({
        url: "https://example.com/backfilled",
        access: "full_text",
        faviconUrl: "https://icons.example.com/backfill.ico",
      }),
    ]);
  });
});
