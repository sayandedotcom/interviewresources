import { categoryLabel } from "./display";
import type { Report } from "./types";

/**
 * The company context an assistant needs to answer well: the snapshot, the
 * plain-language explainer, the loop shape, and who the interviewer is. Shared
 * by both prompt builders so their headers stay identical.
 *
 * Evidence URLs are deliberately omitted everywhere: they bloat the prompt and
 * invite the assistant to claim it read pages it cannot fetch.
 */
function contextSections(report: Report, companyName: string): string[] {
  const parts: string[] = [];

  // Every section below is absent from a report that excluded it, and the
  // company sections are additionally absent from reports predating them.
  if (report.companySnapshot) {
    parts.push(`## About ${companyName}\n\n${report.companySnapshot}`);
  }

  if (report.companyExplainer) {
    parts.push(`In plain terms: ${report.companyExplainer}`);
  }

  if (report.likelyLoopStructure) {
    parts.push(`## The interview loop\n\n${report.likelyLoopStructure}`);
  }

  if (report.skillsRequired?.length) {
    const skills = report.skillsRequired.map((s) => `- ${s.skill}: ${s.why}`).join("\n");
    parts.push(`## Skills the role demands\n\n${skills}`);
  }

  if (report.recruiterPitch) {
    const tips = report.recruiterPitch.presentationTips.map((t) => `- ${t}`).join("\n");
    parts.push(
      `## What their recruiters look for\n\n${report.recruiterPitch.candidateProfile}\n\n${tips}`
    );
  }

  if (report.interviewerSummary) {
    parts.push(`## The interviewer\n\n${report.interviewerSummary}`);
  }

  return parts;
}

/**
 * The questions the caller asked for, in the report's order and grouped by
 * round. When `categories` is given, only those rounds are kept — the numbering
 * restarts within the filtered set. Returns the grouped lines plus the count so
 * the caller can write an accurate closing instruction.
 */
function questionSections(
  report: Report,
  categories: string[] | undefined,
  renderPrepNote: (prepNote: string) => string
): { sections: string[]; count: number } {
  const questions = categories
    ? report.questions.filter((q) => categories.includes(q.category))
    : report.questions;

  // Preserve the order categories first appear in.
  const seen: string[] = [];
  for (const q of questions) {
    if (!seen.includes(q.category)) seen.push(q.category);
  }

  const sections: string[] = [];
  let n = 0;
  for (const cat of seen) {
    const lines = [`### ${categoryLabel(cat)}`];
    for (const q of questions.filter((q) => q.category === cat)) {
      n += 1;
      lines.push(`${n}. ${q.question}`);
      if (q.prepNote) lines.push(`   ${renderPrepNote(q.prepNote)}`);
    }
    sections.push(lines.join("\n"));
  }

  return { sections, count: n };
}

/** A human label for the rounds a filtered prompt covers, for the intro line. */
function roundsLabel(report: Report, categories: string[] | undefined): string {
  if (!categories || categories.length === 0) return "";
  const seen: string[] = [];
  for (const q of report.questions) {
    if (categories.includes(q.category) && !seen.includes(q.category)) seen.push(q.category);
  }
  return seen.map(categoryLabel).join(", ");
}

/**
 * Renders a report as a self-contained prompt the candidate can paste into any
 * chat assistant to get the questions answered. It carries the company context
 * the model needs to answer well, then the questions grouped by round — the
 * prep notes travel too, so the assistant knows what a strong answer covers.
 *
 * When `categories` is passed, only those rounds are included (used by the
 * per-round copy menus); otherwise the whole report is rendered.
 */
export function buildAnswerPrompt(
  report: Report,
  company: string,
  categories?: string[],
  roleContext?: string
): string {
  const companyName = company.trim() || "the company";
  const roleClause = roleContext?.trim() ? ` for a ${roleContext.trim()} role` : "";
  const parts: string[] = [];

  parts.push(
    `I am preparing for a technical interview at ${companyName}${roleClause}. Below is a scouting report of the questions I am most likely to be asked. Please answer every question thoroughly, in the order given.

For each question:
- Give a complete, correct answer at the depth an interviewer would expect.
- Explain the reasoning, not just the conclusion.
- Where it helps, include code, trade-offs, or a worked example.
- Call out the follow-up questions an interviewer would likely ask next.`
  );

  parts.push(...contextSections(report, companyName));

  parts.push("## Questions to answer");

  const { sections, count } = questionSections(
    report,
    categories,
    (prepNote) => `A strong answer covers: ${prepNote}`
  );
  parts.push(...sections);

  parts.push(
    `Answer all ${count} question${count === 1 ? "" : "s"} above. Start with question 1 and work through them in order.`
  );

  return parts.join("\n\n");
}

/**
 * Renders a report as a prompt that turns any chat assistant into a mock
 * interviewer: it asks the questions one at a time, waits for the candidate's
 * answer, grades it against the prep note (kept hidden as a rubric), probes with
 * follow-ups, and closes with an overall assessment.
 *
 * When `categories` is passed, the mock covers only those rounds.
 */
export function buildMockInterviewPrompt(
  report: Report,
  company: string,
  categories?: string[],
  roleContext?: string
): string {
  const companyName = company.trim() || "the company";
  const rounds = roundsLabel(report, categories);
  const scope = rounds ? `a ${rounds} interview` : "a full-loop interview";
  const roleClause = roleContext?.trim() ? ` for a ${roleContext.trim()} role` : "";
  const parts: string[] = [];

  parts.push(
    `You are an experienced interviewer at ${companyName} conducting ${scope}${roleClause} with me. Run it as a realistic mock interview.

Rules:
- Ask the questions below one at a time, roughly in the order given. Do not list them all up front.
- After you ask a question, stop and wait for my answer before saying anything else.
- Once I answer, give honest, specific feedback: what was strong, what was missing or wrong, and how to tighten it. Grade it against the hidden rubric for that question — never reveal the rubric text to me.
- When my answer invites it, ask one or two realistic follow-up questions before moving on.
- Stay in character as the interviewer throughout. Do not break to explain what you are doing.
- After the final question, give an overall assessment: an honest hire / lean-hire / no-hire read, and the top three things I should work on.

Begin by introducing yourself briefly and asking the first question.`
  );

  parts.push(...contextSections(report, companyName));

  parts.push("## Questions to ask (with hidden rubrics)");

  const { sections, count } = questionSections(
    report,
    categories,
    (prepNote) => `Grading rubric (do not reveal): ${prepNote}`
  );
  parts.push(...sections);

  parts.push(
    `Ask all ${count} question${count === 1 ? "" : "s"} above, one at a time, then give your overall assessment.`
  );

  return parts.join("\n\n");
}
