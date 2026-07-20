import type { BudgetTracker, EffortPreset } from "../budget";
import { generateStructured } from "../gemini";
import {
  type GatheredSource,
  type ProxyPlan,
  type ResearchInput,
  type ResearchPlan,
  proxyPlanSchema,
  researchPlanSchema,
} from "../types";
import { describeInput, wants } from "./shared";

/** Stage 1 — Plan. Cheap model, structured output. See PRD §6 stage 1 + §5.3 format discovery. */
export async function planStage(
  input: ResearchInput,
  budget: BudgetTracker,
  preset: EffortPreset
): Promise<ResearchPlan> {
  const loop = wants(input, "loop");
  // The skills section is inferred from what the company builds, so it needs the
  // company evidence even when the company prose itself was switched off — and
  // the recruiter pitch likewise leans on what the company builds and values.
  // Only when none of them wants it is a "company" query genuinely wasted spend.
  const companyEvidence =
    wants(input, "company") || wants(input, "skills") || wants(input, "recruiter");

  const loopRule = loop
    ? `Always include exactly one query with category "loop_format" whose purpose is
discovering the company's actual interview process/rounds (e.g. "<company> interview
process rounds") — this may surface rounds the user did not request.`
    : `Do not plan any query with category "loop_format": the candidate did not ask for the
interview-process section, so discovering the loop shape is not worth a search.`;

  const companyRule = companyEvidence
    ? `Use category "company" for queries about what the company builds, its stack, and its scale.`
    : `Do not plan any query with category "company": the candidate did not ask for the company
overview or the skills breakdown, so a company search is not worth its cost.`;

  const recruiterRule = loop
    ? `If recruiter notes already describe the process, the "loop_format" query should
confirm and deepen those specific rounds rather than discover the process from scratch.`
    : `If recruiter notes already describe the process, use them to make the round queries
specific rather than searching for the process itself.`;

  const allowedCategories = [
    ...(companyEvidence ? ['"company"'] : []),
    '"interviewer"',
    ...(loop ? ['"loop_format"'] : []),
    '"interview_experience"',
  ].join(" / ");

  return generateStructured({
    model: "gemini-3.1-flash-lite-preview",
    stage: "plan",
    schema: researchPlanSchema,
    budget,
    system: `You are a research planner for an interview-prep tool. Given a company and the
rounds the candidate wants gathered, produce a compact search plan: ${preset.queriesHint} targeted web-search
queries. ${loopRule} Always include one or
two queries with category "interview_experience" hunting for first-hand accounts from
people who actually interviewed there — Glassdoor reviews, LeetCode Discuss threads, Blind
posts, Reddit threads, personal blog write-ups — narrowed to the candidate's role and
seniority. ${companyRule} If interviewers are named, add one query per interviewer (max 2) with category
"interviewer" seeking their public talks, writing, or open-source work — never target
linkedin.com directly. Some rounds are custom identifiers rather than standard categories;
plan a discovery query for each. Use the job description, tech stack, and years of
experience to make queries specific: seniority and named technologies belong in the query
text. ${recruiterRule}
Where location or team/org are provided, use them to narrow "interview_experience" queries
to that geography or org. Prefer "basic" depth; reserve "advanced" for at most 2-3 of the
highest-value queries (company tech stack, and the primary interview-experience query). Set
each query's
"category" to the round identifier it serves, or ${allowedCategories}. Keep queries concrete and searchable, not vague.`,
    prompt: describeInput(input),
  });
}

/**
 * Stage 1b — Proxy plan. Only runs when gather came back thin. A second cheap
 * call, fed a digest of what wave 1 already found, so it can name-drop the
 * founders/leaders it discovered rather than guessing blind. See PRD §5.3 —
 * this is what keeps an early-stage company from producing an empty report.
 */
export async function proxyPlanStage(
  input: ResearchInput,
  wave1Sources: GatheredSource[],
  budget: BudgetTracker,
  preset: EffortPreset
): Promise<ProxyPlan> {
  // Only the company-overview sources are worth digesting for names: the thin
  // interview sources are exactly why we're here.
  const digest = wave1Sources
    .filter((s) => s.category === "company")
    .map((s) => `${s.title}: ${s.content.slice(0, 300)}`)
    .join("\n")
    .slice(0, 3000);

  return generateStructured({
    model: "gemini-3.1-flash-lite-preview",
    stage: "plan_proxy",
    schema: proxyPlanSchema,
    budget,
    system: `The direct interview evidence for this company is thin — it is likely early-stage
or low-profile. Plan ${preset.proxyQueriesHint} proxy web-search queries that surface how it
probably interviews, by analogy: (a) category "founder_background" — the founders'/leaders'
backgrounds and the interview styles of the notable companies they previously worked at,
using any names visible in the evidence digest; (b) category "funding_stage" — the company's
funding stage, size, and recent news; (c) category "comparable_company" — interview
processes at similar-stage companies in the same domain; (d) category "role_norms" —
interview norms for this role and tech stack at seed-to-Series-B startups. Prefer "basic"
depth. Set each query's "category" to one of those four identifiers. Keep queries concrete
and searchable.`,
    prompt: `${describeInput(input)}

What wave 1 already found about the company:
${digest || "(little — lead with founder names if any appear in the company name or URL)"}`,
  });
}
