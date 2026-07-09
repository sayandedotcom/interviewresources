import { categoryLabel } from "./display";
import type { Report } from "./types";

/**
 * Renders a report as a self-contained prompt the candidate can paste into any
 * chat assistant to get the questions answered. It carries the company context
 * the model needs to answer well, then the questions grouped by round — the
 * prep notes travel too, so the assistant knows what a strong answer covers.
 *
 * Evidence URLs are deliberately omitted: they bloat the prompt and invite the
 * assistant to claim it read pages it cannot fetch.
 */
export function buildAnswerPrompt(report: Report, company: string): string {
  const companyName = company.trim() || "the company";
  const parts: string[] = [];

  parts.push(
    `I am preparing for a technical interview at ${companyName}. Below is a scouting report of the questions I am most likely to be asked. Please answer every question thoroughly, in the order given.

For each question:
- Give a complete, correct answer at the depth an interviewer would expect.
- Explain the reasoning, not just the conclusion.
- Where it helps, include code, trade-offs, or a worked example.
- Call out the follow-up questions an interviewer would likely ask next.`
  );

  parts.push(`## About ${companyName}\n\n${report.companySnapshot}`);

  // Reports generated before companyExplainer existed are stored without it.
  if (report.companyExplainer) {
    parts.push(`In plain terms: ${report.companyExplainer}`);
  }

  if (report.likelyLoopStructure) {
    parts.push(`## The interview loop\n\n${report.likelyLoopStructure}`);
  }

  if (report.interviewerSummary) {
    parts.push(`## The interviewer\n\n${report.interviewerSummary}`);
  }

  parts.push("## Questions to answer");

  // Group in the order the questions appear, so the prompt mirrors the report.
  const seen: string[] = [];
  for (const q of report.questions) {
    if (!seen.includes(q.category)) seen.push(q.category);
  }

  let n = 0;
  for (const cat of seen) {
    const lines = [`### ${categoryLabel(cat)}`];
    for (const q of report.questions.filter((q) => q.category === cat)) {
      n += 1;
      lines.push(`${n}. ${q.question}`);
      if (q.prepNote) lines.push(`   A strong answer covers: ${q.prepNote}`);
    }
    parts.push(lines.join("\n"));
  }

  parts.push(
    `Answer all ${n} question${n === 1 ? "" : "s"} above. Start with question 1 and work through them in order.`
  );

  return parts.join("\n\n");
}
