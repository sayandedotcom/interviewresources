import { z } from "zod";

import type { BudgetTracker, EffortPreset } from "../budget";
import { generateStructured } from "../gemini";
import {
  type CompressedNote,
  type GeneratedReport,
  type ImportantLink,
  type Report,
  type ResearchInput,
  reportSchema,
} from "../types";
import { describeInput, wants } from "./shared";

/** The report fields a switched-off section removes from the generation schema. */
type OptionalReportField =
  | "companySnapshot"
  | "companyExplainer"
  | "likelyLoopStructure"
  | "skillsRequired"
  | "interviewExperiences"
  | "recruiterPitch";

/** Stage 4 — Synthesize. One strong call producing the final structured report. */
export async function synthesizeStage(
  input: ResearchInput,
  notes: CompressedNote[],
  budget: BudgetTracker,
  preset: EffortPreset,
  broadened: boolean
): Promise<Report> {
  const evidenceBlock = notes
    .map((n, i) => `[${i + 1}] (${n.category}) ${n.sourceTitle} — ${n.sourceUrl}\n${n.summary}`)
    .join("\n\n");

  // The relaxation block only enters the prompt when the proxy wave fired, so a
  // well-documented company's synthesis is byte-identical to the strict past.
  const basisRules = broadened
    ? `- Direct interview evidence for this company is thin, so proxy evidence is included in
  the notes under categories "founder_background", "funding_stage", "comparable_company",
  and "role_norms". You may predict questions inferred from it. Set a question's "basis" to
  "evidence" only when it is grounded in a direct account of interviewing at THIS company;
  set "basis" to "inferred" when it derives from proxy evidence.
- An inferred question must still cite the proxy-evidence URLs it rests on, and its
  rationale must name the specific proxy signal it leans on (e.g. "the CTO ran Stripe's
  infra loop 2019-2022, so expect practical systems questions" or "Series A infra startups
  of this size typically run a take-home plus a pairing round"). An inferred question is
  never confidence "high".`
    : `- Set every question's "basis" to "evidence".`;

  // Only present on an extension run, where the caller wants fresh questions
  // rather than the ones the report already shows.
  const excludeBlock = input.excludeQuestions.length
    ? `\n\nAlready predicted — do NOT repeat or rephrase any of these:\n${input.excludeQuestions
        .map((q) => `- ${q}`)
        .join("\n")}`
    : "";

  const company = wants(input, "company");
  const loop = wants(input, "loop");
  const skills = wants(input, "skills");
  const experiences = wants(input, "experiences");
  const recruiter = wants(input, "recruiter");

  // A section the caller switched off is cut from the schema, so the model is
  // never asked for it and never bills output tokens writing it. The matching
  // rule is cut from the prompt for the same reason.
  const omitMask: Partial<Record<OptionalReportField, true>> = {};
  if (!company) {
    omitMask.companySnapshot = true;
    omitMask.companyExplainer = true;
  }
  if (!loop) omitMask.likelyLoopStructure = true;
  if (!skills) omitMask.skillsRequired = true;
  if (!experiences) omitMask.interviewExperiences = true;
  if (!recruiter) omitMask.recruiterPitch = true;

  // The cast keeps the full generated shape in the types: which keys the schema
  // actually carries is a runtime decision, and the reads below are already
  // guarded by the same flags that built the mask.
  const genSchema = reportSchema.omit(omitMask) as unknown as z.ZodType<GeneratedReport>;

  const rules = [
    company &&
      `- Write companyExplainer for someone who has never heard of the company: 2-3 sentences,
  no jargon, no buzzwords, ending with one concrete everyday example of the product in
  action (e.g. "When you buy shoes online and pay by card, Stripe is the service that
  checks the card and moves the money to the store."). companySnapshot stays the
  technical view: stack, scale signals, engineering culture.`,
    `- Set each question's "category" to one of the round identifiers from "Rounds to scout",
  copied character-for-character. Never invent a new identifier or reformat an existing one.`,
    `- Every question must cite at least one evidence URL from the notes it's grounded in.`,
    basisRules,
    `- If evidence for a requested round is thin, say so honestly in the rationale and
  mark confidence "low" rather than fabricating specifics.`,
    loop &&
      `- If the loop-format evidence reveals a round type the user didn't request, include it
  anyway and note in the rationale that it wasn't explicitly requested.`,
    `- Calibrate difficulty to the candidate's years of experience, and bias question topics
  toward their tech stack and the job description when those are provided.`,
    `- Summarize each named interviewer in interviewerSummary using only public evidence in the
  notes; if several were named, cover each briefly.`,
    `- Do not invent citations. Do not invent company facts not present in the notes.`,
    `- Aim for ${preset.questionTarget} questions total across the requested rounds, prioritizing breadth
  across rounds over depth in one. Do not pad: a question you cannot ground in the notes
  does not belong in the report, even if that leaves you short of the range.`,
    `- If an "Already predicted" list is present, treat those questions as taken: never repeat
  one, and never restate one in different words. Cover different ground instead.`,
    skills &&
      `- In skillsRequired, name the skills this specific role actually demands. Do not merely
  restate the job description's bullet list: the value is in the skills the posting leaves
  implicit but the company's product makes unavoidable. If the evidence shows the company
  builds autonomous web agents, a candidate needs to understand agent architecture, tool
  calling, and browser automation, whether or not the posting says so. Work from what the
  company builds, the stack the evidence reveals, the scale it operates at, and the job
  description together. Each "why" is one sentence naming the reason the role needs it,
  grounded in the evidence or the job description — never a restatement of the skill.
  Order them most to least important, and keep each "skill" short enough to read as a
  badge. Do not pad with generic filler ("communication", "problem solving") unless the
  evidence specifically calls it out.`,
    experiences &&
      `- In interviewExperiences, list every first-hand account of interviewing at this company
  that the notes contain — a candidate's write-up, a Glassdoor or Blind or Reddit or
  LeetCode Discuss thread, a personal blog post — using only URLs that appear in the notes.
  Write each "why" for the candidate, naming the role, the level, and how recent the
  account is whenever the notes reveal them (e.g. "A 2024 E5 backend candidate's full loop
  breakdown, round by round"). If the notes contain no first-hand account, return an empty
  array — never invent one, and never fill it with generic listicles or job postings.`,
    recruiter &&
      `- In recruiterPitch, describe the candidate this company's recruiters are actually
  screening for and how to present yourself to them. candidateProfile is a short paragraph
  (2-3 sentences) naming the backgrounds, signals, and traits their screens favour —
  grounded in what the company builds, its stated values, and how candidates in the notes
  describe its recruiter screens, never generic recruiting advice. presentationTips is 4-6
  concrete, actionable tips: what to lead with on the resume and in the recruiter call,
  which experience or projects to foreground, which keywords to surface. Each tip must be
  specific to THIS company and role — never boilerplate like "be confident" or "research
  the company".`,
    `- In importantLinks, pick the ${preset.linksHint} highest-value sources for the candidate to read before
  the interview, using only URLs that appear in the evidence notes. Favour the company's
  engineering blog, its public docs, and interviewer talks or writing over generic
  listicles.${
    experiences ? " Never repeat a URL you already placed in interviewExperiences." : ""
  } Write each
  "why" for the candidate, naming what they will get from it.`,
  ]
    .filter((rule): rule is string => Boolean(rule))
    .join("\n");

  const generated = await generateStructured({
    model: "gemini-3.1-pro-preview",
    stage: "synthesize",
    schema: genSchema,
    budget,
    system: `You are an expert interview coach. Using ONLY the evidence notes provided,
produce a report predicting likely interview questions for the given company and rounds.
Standard rounds follow the PRD §5.3 taxonomy: dsa, system_design, domain_quiz, take_home,
pair_programming, behavioral, hr_culture. The candidate may also have added custom rounds,
which appear verbatim in the "Rounds to scout" list.

Rules:
${rules}`,
    prompt: `${describeInput(input)}

Evidence notes:
${evidenceBlock || "(no evidence gathered — degrade gracefully, mark everything low confidence)"}${excludeBlock}`,
  });

  // Field by field, not a spread of defaults under the result: an omitted
  // section must land as null even if the model (or a test double) hands back
  // more than the schema asked for.
  const report: Report = {
    ...generated,
    companySnapshot: company ? generated.companySnapshot : null,
    companyExplainer: company ? generated.companyExplainer : null,
    likelyLoopStructure: loop ? generated.likelyLoopStructure : null,
    skillsRequired: skills ? generated.skillsRequired : null,
    interviewExperiences: experiences ? generated.interviewExperiences : null,
    recruiterPitch: recruiter ? generated.recruiterPitch : null,
  };

  // A URL the notes never contained is a hallucination — strip it from both
  // question citations and importantLinks before it reaches the UI as a link.
  const known = new Set(notes.map((n) => n.sourceUrl));

  for (const q of report.questions) {
    q.evidenceUrls = q.evidenceUrls.filter((url) => known.has(url));
    // The prompt requires every question to cite evidence; one that lost all
    // of its citations is ungrounded, so its confidence claim is too.
    if (q.evidenceUrls.length === 0) q.confidence = "low";
    // Belt-and-suspenders on the basis label: default a missing one to the
    // safe reading, and never let an inferred question claim high confidence.
    if (!q.basis) q.basis = "evidence";
    if (q.basis === "inferred" && q.confidence === "high") q.confidence = "medium";
  }

  // `claimed` spans both link sections, so a URL kept as an interview experience
  // cannot appear a second time under Worth reading even if the model repeats it.
  // Only kept URLs are claimed: one dropped at the cap stays available downstream.
  const claimed = new Set<string>();
  const keepLinks = (links: ImportantLink[]) => {
    const kept: ImportantLink[] = [];
    for (const link of links) {
      if (kept.length >= preset.linksMax) break;
      if (!known.has(link.url) || claimed.has(link.url)) continue;
      claimed.add(link.url);
      kept.push(link);
    }
    return kept;
  };

  // Null stays null: an excluded section was never searched for, which is not
  // the same claim as "we looked and found nothing".
  if (report.interviewExperiences) {
    report.interviewExperiences = keepLinks(report.interviewExperiences);
  }
  report.importantLinks = keepLinks(report.importantLinks);

  return report;
}
