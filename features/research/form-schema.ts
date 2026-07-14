import { z } from "zod";

import { EFFORT_LEVELS } from "@/lib/research/budget";
import {
  MAX_COMPANY_NAME,
  MAX_LOCATION,
  MAX_ROLE_CONTEXT,
  MAX_TEAM_CONTEXT,
  MAX_TECH_STACK,
  MAX_URL,
  MAX_YEARS_EXPERIENCE,
  REPORT_SECTIONS,
} from "@/lib/research/types";

/** Loose enough to accept "https://x.com" while still catching "not a url" typos. */
const optionalUrl = z
  .string()
  .max(MAX_URL)
  .refine((val) => val === "" || z.string().url().safeParse(val).success, {
    message: "Enter a valid URL",
  });

export const formInterviewerSchema = z.object({
  name: z.string().max(MAX_COMPANY_NAME),
  url: optionalUrl,
});

/**
 * Client-side mirror of researchInputSchema (lib/research/types.ts), shaped for
 * a form: every field is a plain string (react-hook-form doesn't do undefined
 * well), and required-ness is enforced with .min(1) instead of Zod optionals.
 * Submission trims and drops empties before hitting the API, where the real
 * boundary schema runs again.
 */
export const researchFormSchema = z.object({
  company: z.string().min(1, "Company is required").max(MAX_COMPANY_NAME),
  companyUrl: optionalUrl,
  role: z.string().max(MAX_ROLE_CONTEXT),
  yearsExperience: z.string().max(MAX_YEARS_EXPERIENCE),
  techStack: z.string().max(MAX_TECH_STACK),
  location: z.string().max(MAX_LOCATION),
  teamContext: z.string().max(MAX_TEAM_CONTEXT),
  jobDescription: z.string(),
  recruiterNotes: z.string(),
  interviewers: z.array(formInterviewerSchema),
  rounds: z.array(z.string()).min(1, "Pick at least one round"),
  effort: z.enum(EFFORT_LEVELS),
  // No .min(): dropping every optional section is a legitimate choice — the
  // questions, prep plan, and links are produced either way.
  sections: z.array(z.enum(REPORT_SECTIONS)),
});

export type ResearchFormValues = z.infer<typeof researchFormSchema>;

export const emptyFormValues: ResearchFormValues = {
  company: "",
  companyUrl: "",
  role: "",
  yearsExperience: "",
  techStack: "",
  location: "",
  teamContext: "",
  jobDescription: "",
  recruiterNotes: "",
  interviewers: [{ name: "", url: "" }],
  rounds: ["dsa", "system_design"],
  effort: "medium",
  sections: [...REPORT_SECTIONS],
};

/**
 * Single key backing the whole form's draft. The landing page and /prepare
 * both render <ResearchExperience>, so sharing this key means progress
 * started on one page survives a navigation to the other.
 */
export const FORM_DRAFT_KEY = "research-form-draft";

export function loadDraft(): ResearchFormValues | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(FORM_DRAFT_KEY);
    if (!raw) return null;
    const parsed = researchFormSchema.partial().safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    return { ...emptyFormValues, ...parsed.data };
  } catch {
    return null;
  }
}

export function saveDraft(values: ResearchFormValues): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(values));
  } catch {
    // Storage full or unavailable (private browsing) — draft persistence is
    // a nicety, not a requirement, so fail silently.
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(FORM_DRAFT_KEY);
  } catch {
    // See saveDraft.
  }
}

/** True once any field has diverged from the pristine default — gates the Clear button. */
export function isDraftDirty(values: ResearchFormValues): boolean {
  return JSON.stringify(values) !== JSON.stringify(emptyFormValues);
}
