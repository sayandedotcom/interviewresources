# "How to Impress Recruiter" report section

## Problem

The /prepare form's "Report Sections" picker offers four sections (company, loop,
skills, experiences), all selected by default. Candidates also want to know what
kind of candidate a company's recruiters screen for and how to present themselves
to match — recruiter-facing prep the report doesn't cover today.

## Design

Add a fifth report section, id `recruiter`, that is **unselected by default**
(the first opt-in section) with a tooltip in the picker like its siblings.

**Content shape** (user-approved): a `recruiterPitch` object on the report —

- `candidateProfile: string` — 2-3 sentences on the backgrounds, signals, and
  traits this company's recruiter screens favour, grounded in evidence.
- `presentationTips: string[]` — 4-6 concrete, company-specific tips on what to
  lead with on the resume and in the recruiter call.

**Default-off mechanism**: a new `DEFAULT_SECTIONS` const (the four existing
ids) in `lib/research/types.ts`. `REPORT_SECTIONS` gains `"recruiter"` and keeps
driving validity (form enum, extend route, picker options, missingSections);
only the two defaults — `researchInputSchema.sections` and
`emptyFormValues.sections` — switch to `DEFAULT_SECTIONS`. Legacy stored inputs
that relied on the default therefore never gain the section retroactively.

**Pipeline**: no new search queries for v1 — the section synthesizes from
evidence already gathered. The `companyEvidence` gate in `pipeline/plan.ts` and
`pipeline/index.ts` extends to `wants(input, "recruiter")` so a recruiter-only
request still keeps company queries. In `synthesize.ts`, the field joins
`OptionalReportField`/omitMask, gets a prompt rule, and is nulled back when not
requested.

**Storage**: `storedReportSchema.recruiterPitch` is `.nullable().optional()` —
null = declined, absent = legacy report. No DB migration (rides in
`reports.jsonPayload` jsonb). `missingSections` returns `recruiter` for both,
so the report page's "Keep on Generating" panel offers it automatically; the
extend route merges it via `existing.recruiterPitch ?? addition.recruiterPitch`.

**UI**: picker chip labeled "Impress the recruiter", code `REC`, icon
`UserCheck`, tooltip blurb "Who their recruiters are looking for, and how to
present yourself to match". Report view renders the section between "Skills
required" and "Predicted questions": profile paragraph plus a `→`-prefixed tip
list. Also included in the copy-prompt builders (`prompt.ts`) and the PDF.

## Testing

Fix defaults-based assertions (types, pipeline fixture, form-schema comment,
report-view full-report fixture, section-picker "every section" loop). New
tests: schema validity/nullability, missingSections cases, pipeline
inclusion/omission, picker default-off (`aria-pressed="false"`), report-view
render/hide/legacy, extend-route scouting, prompt inclusion.
