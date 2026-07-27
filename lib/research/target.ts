import type { ResearchInput, TargetProfile } from "./types";

function domainFrom(url: string | undefined): string[] {
  if (!url) return [];
  try {
    return [new URL(url).hostname.toLocaleLowerCase().replace(/^www\./u, "")];
  } catch {
    return [];
  }
}

/**
 * Safe fallback for callers and old test fixtures that do not yet carry a
 * planner-generated profile. It copies user data without trying to infer a
 * locale, seniority ladder, role family, or geographic alias.
 */
export function targetProfileFromInput(input: ResearchInput): TargetProfile {
  return {
    company: {
      canonicalName: input.companyName,
      aliases: [input.companyName],
      domains: domainFrom(input.companyUrl),
    },
    role: {
      canonicalTitle: input.roleContext?.trim() || null,
      aliases: input.roleContext?.trim() ? [input.roleContext.trim()] : [],
      description: input.jobDescription?.slice(0, 1200).trim() || null,
      seniority: null,
      experience: {
        minYears: null,
        maxYears: null,
        raw: input.yearsExperience?.trim() || null,
      },
      skills: input.techStack?.trim() ? [input.techStack.trim()] : [],
    },
    location: {
      canonicalName: input.location?.trim() || null,
      aliases: input.location?.trim() ? [input.location.trim()] : [],
      country: null,
      searchVariants: input.location?.trim() ? [input.location.trim()] : [],
    },
    searchLanguages: [],
  };
}

export function describeTargetProfile(profile: TargetProfile): string {
  return JSON.stringify(profile, null, 2);
}
