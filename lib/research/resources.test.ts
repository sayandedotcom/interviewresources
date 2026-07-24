import { describe, expect, it } from "vitest";

import { canonicalizePublicUrl, mergeResearchResources, rankResourceCandidates } from "./resources";
import { DEFAULT_SECTIONS, type ResearchInput, type ResourceCandidate } from "./types";

const input: ResearchInput = {
  companyName: "Acme",
  roleContext: "Backend Engineer",
  interviewers: [],
  interviewTypes: ["dsa"],
  fullLoop: false,
  excludeQuestions: [],
  effort: "medium",
  sections: [...DEFAULT_SECTIONS],
};

function candidate(overrides: Partial<ResourceCandidate> = {}): ResourceCandidate {
  return {
    url: "https://example.com/post",
    title: "Acme backend interview",
    score: 0.8,
    queries: ["Acme backend interview"],
    purposes: ["find a first-hand interview account"],
    categories: ["interview_experience"],
    domain: "example.com",
    access: "link_only",
    extractionOutcome: "failed",
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

describe("rankResourceCandidates", () => {
  it("combines relevance and company/role specificity", () => {
    const generic = candidate({
      url: "https://generic.dev/post",
      domain: "generic.dev",
      title: "General interview guide",
      queries: ["interview guide"],
      score: 0.82,
    });
    const specific = candidate({
      url: "https://specific.dev/post",
      domain: "specific.dev",
      score: 0.75,
    });

    expect(rankResourceCandidates([generic, specific], input)[0].url).toBe(specific.url);
  });

  it("promotes domain diversity without discarding repeated-domain results", () => {
    const ranked = rankResourceCandidates(
      [
        candidate({ url: "https://same.dev/a", domain: "same.dev", score: 0.95 }),
        candidate({ url: "https://same.dev/b", domain: "same.dev", score: 0.94 }),
        candidate({ url: "https://other.dev/a", domain: "other.dev", score: 0.9 }),
      ],
      input
    );

    expect(ranked.slice(0, 2).map((item) => item.domain)).toEqual(["same.dev", "other.dev"]);
    expect(ranked).toHaveLength(3);
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
});
