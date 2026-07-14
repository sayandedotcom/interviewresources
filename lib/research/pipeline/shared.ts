import type { PipelineProgressEvent, ReportSection, ResearchInput } from "../types";

export type OnProgress = (event: PipelineProgressEvent) => void;

export const noopProgress: OnProgress = () => {};

export function emit(
  onProgress: OnProgress,
  stage: PipelineProgressEvent["stage"],
  message: string
) {
  onProgress({ stage, message, at: new Date().toISOString() });
}

/**
 * The optional sections this run was asked for. Read through a helper rather
 * than off the array directly so every stage agrees on what "off" means.
 */
export function wants(input: ResearchInput, section: ReportSection): boolean {
  return input.sections.includes(section);
}

/** Shared context block so plan and synthesize see the same picture of the candidate. */
export function describeInput(input: ResearchInput): string {
  const interviewers = input.interviewers.length
    ? input.interviewers.map((i) => `${i.name}${i.url ? ` (${i.url})` : ""}`).join("; ")
    : "not provided";

  return `Company: ${input.companyName}${input.companyUrl ? ` (${input.companyUrl})` : ""}
Interviewers: ${interviewers}
Rounds to scout: ${input.interviewTypes.join(", ")}
Role context: ${input.roleContext ?? "not provided"}
Candidate years of experience: ${input.yearsExperience || "not provided"}
Candidate tech stack: ${input.techStack || "not provided"}
Location: ${input.location || "not provided"}
Team / org: ${input.teamContext || "not provided"}
Recruiter notes on the process: ${input.recruiterNotes || "not provided"}
Job description: ${input.jobDescription ? input.jobDescription.slice(0, 2000) : "not provided"}`;
}

/**
 * Runs `fn` over `items` in chunks of `size`, re-checking `shouldStop` between
 * chunks so a blown budget stops dispatching new work while in-flight results
 * are kept. `fn` must handle its own errors — a rejection here would discard
 * the whole chunk.
 */
export async function mapChunked<T, R>(
  items: T[],
  size: number,
  shouldStop: () => boolean,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    if (shouldStop()) break;
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}
