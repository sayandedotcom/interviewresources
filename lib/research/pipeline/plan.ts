import type { BudgetTracker, EffortPreset } from "../budget";
import { generateStructured } from "../gemini";
import { describeTargetProfile } from "../target";
import {
  type GatheredSource,
  type ProxyPlan,
  type ResearchInput,
  type ResearchPlan,
  type TargetProfile,
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
    model: "gemini-3.1-flash-lite",
    stage: "plan",
    schema: researchPlanSchema,
    budget,
    maxOutputTokens: 6_000,
    system: `You are a research planner for an interview-prep tool. Given a company and the
rounds the candidate wants gathered, produce a compact search plan: ${preset.queriesHint} targeted web-search
queries. First resolve a targetProfile from the supplied facts:
- Preserve the company's local-script and international names, known aliases, and public domains.
- Infer the role title, role aliases, seniority, experience range, and skills only when supported
  by the supplied role context or job description. Do not impose a universal level ladder.
- Resolve the location, country, local aliases, transliterations, and useful search variants
  dynamically. Preserve non-Latin text.
- Choose searchLanguages from the target, location, and likely source ecosystem. Queries may use
  multiple languages when that improves coverage.

${loopRule} Always include focused queries with category "interview_experience" for first-hand
accounts from people who actually interviewed there, narrowed to the resolved target where
possible. Diversify source formats and ecosystems: community discussions, video accounts,
personal writing, and the open web. Use includeDomains only when a domain is genuinely useful
for this target; do not bake one platform list into every plan. Keep both recent and timeless
discovery where useful. ${companyRule} If interviewers are named, add at most two "interviewer"
queries for their public technical work. Some rounds are custom identifiers; plan a discovery
query for each. Use the job description, skills, seniority, team, and experience to make searches
specific without assuming unstated target attributes. For each requested round, prefer a focused
exact-target query over one broad query containing weak synonyms. Set excludeDomains per query
when the resolved company identity could collide with consumer help, account, product-support,
or unrelated properties. ${recruiterRule} Prefer "basic" depth; reserve "advanced" for the
highest-value evidence queries.

Also produce fallbackQueries for weak-round follow-up. They must be alternative search
formulations and source ecosystems, not repetitions of primary queries. Include up to
${preset.gapQueriesPerRound} useful fallbacks per requested round and never exceed
${preset.gapQueryLimit} total. Set every query category to the exact round identifier it serves,
or ${allowedCategories}. Keep all queries concrete and searchable.`,
    prompt: describeInput(input),
  });
}

/** Extra exact-target discovery for requested rounds that wave 1 covered poorly. */
export function gapPlanStage(
  plan: ResearchPlan,
  categories: string[],
  preset: EffortPreset
): Pick<ResearchPlan, "queries"> {
  const queries = categories
    .flatMap((category) =>
      plan.fallbackQueries
        .filter((query) => query.category === category)
        .slice(0, preset.gapQueriesPerRound)
    )
    .slice(0, preset.gapQueryLimit);

  return { queries };
}

/**
 * Stage 1b — Proxy plan. Only runs when gather came back thin. A second cheap
 * call, fed a digest of what wave 1 already found, so it can name-drop the
 * founders/leaders it discovered rather than guessing blind. See PRD §5.3 —
 * this is what keeps an early-stage company from producing an empty report.
 */
export async function proxyPlanStage(
  input: ResearchInput,
  targetProfile: TargetProfile,
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
    model: "gemini-3.1-flash-lite",
    stage: "plan_proxy",
    schema: proxyPlanSchema,
    budget,
    maxOutputTokens: 1_536,
    system: `The direct interview evidence for this company is thin. Plan
${preset.proxyQueriesHint} proxy web-search queries that can calibrate how it may interview:
(a) category "founder_background" for relevant leaders' prior hiring environments;
(b) category "funding_stage" for the target's current maturity, size, and hiring context;
(c) category "comparable_company" for organizations that closely match the discovered target;
(d) category "role_norms" for hiring norms for this target role, skills, seniority, and geography.
Infer maturity from evidence rather than assuming the company is a startup. A comparable
organization must match several concrete dimensions such as maturity, size, product, business
model, technology, hiring geography, and target seniority. The target job description and product
decide subject matter; proxies only calibrate format and depth. Search in the languages and source
ecosystems appropriate to the target. Set every query category to one of those four identifiers
and keep queries concrete.`,
    prompt: `${describeInput(input)}

Resolved target profile:
${describeTargetProfile(targetProfile)}

What wave 1 already found about the company:
${digest || "(little — lead with founder names if any appear in the company name or URL)"}`,
  });
}
