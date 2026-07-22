# PRD — Interview Resources

**Version:** 2.0
**Date:** 2026-07-21
**Owner:** Sayan De
**Website:** interviewresources.app
**Status:** Live — M0–M2 shipped, M3 (quality loop) in progress

> **On the numbers in this document.** Every figure here is either traceable to a
> constant in this repo (cited by file) or explicitly labelled a design target.
> Market sizing, competitor pricing, and measured accuracy claims are absent on
> purpose: they have not been researched, and an unsourced number in a document
> like this is a liability. Where a claim needs evidence before it can be made,
> §14 says so.

---

## 1. Overview

**Interview Resources** gathers the questions a candidate is likely to face in an
upcoming interview, personalised to the company and — optionally — the specific
people interviewing them.

The user provides:

1. **Company** — a URL (preferred) or name
2. **Interviewers** — names and/or LinkedIn URLs _(optional, repeatable)_
3. **Interview types** — one or more categories, or "Full Loop"
4. **Role / job description** _(optional, improves accuracy)_
5. **Effort level** — Low / Medium / High, which sets both depth and spend
6. **Report sections** — which parts of the report to generate

A server-side research pipeline (Tavily search/extract + Gemini) investigates the
company's product, tech stack, engineering culture, publicly reported interview
experiences, and each interviewer's public footprint. It returns a ranked,
categorised report of **pinpointed questions with prep notes, confidence scores,
and evidence citations**.

### One-line pitch

> "Paste the company link, get the questions before they ask them."

### The problem

Candidates prepare by manually stitching together Glassdoor threads, LeetCode
company tags, Blind posts, the company's engineering blog, and the interviewer's
public writing. The information is scattered, stale, and easy to misread. The
alternatives are generic question banks (not company-specific) or human coaching
(expensive, not scalable).

**Who feels it:** software engineers targeting a specific company (primary),
career switchers, new grads. Bootcamps and recruiters are a possible B2B motion
later.

---

## 2. Target Market

### Primary

| Segment              | Description                                       | Pain                                                                         |
| -------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Tech job seekers** | Engineers preparing for a loop at a named company | Hours of scattered prep with no confidence they're studying the right things |
| **Career switchers** | Moving into tech from another field               | No frame of reference for what a given company's rounds even contain         |
| **New grads**        | First technical loops                             | Don't know how difficulty and format differ by company                       |

### Secondary (not built)

Bootcamps (licensed reports or API), recruiters (v2), coaches using the platform
as a data layer.

**Market sizing:** not researched. Any TAM figure in this document would be
invented, so there isn't one. See §14.

---

## 3. How It Works

### User flow

```
Landing → Sign in → Research form (live cost estimate)
   → Credit check → Pipeline runs (SSE progress, ~2–5 min)
   → Report page → Export / Share / Extend / Re-run
```

### 3.1 The research form

Every field either changes what gets researched or what it costs. The form shows
a **pre-flight cost and duration estimate** that updates as the user changes
inputs (`lib/research/estimate.ts`), so nobody spends blind. The estimate is
advisory only — the actual charge is metered from real usage.

#### Company _(required)_

A URL or a name. A name is resolved to a domain with one cheap search call and
confirmed with the user before any credits are spent. Ambiguous inputs
("Amazon" — amazon.com, amazon.jobs, or AWS?) are the most common way to waste a
run, so the confirmation step is load-bearing.

The confirmed domain is the key for all downstream research and for the cache.

#### Interviewers _(optional, repeatable)_

Stored as a JSONB array of `{ name, url }` — **multiple interviewers per run are
supported**, which matters for panel loops.

**We never fetch linkedin.com.** A supplied URL is used only as a search seed.
What the pipeline actually looks for is the person's public footprint: conference
talks, blog posts, GitHub, publications. An interviewer who gave a talk on
scaling Postgres is more likely to probe database internals than one who writes
about payment reliability — that's the signal being extracted.

The UI states the LinkedIn policy explicitly.

#### Interview types _(required, multi-select)_

Stored as comma-joined categories, or the literal `full_loop`.

| Type                        | What it triggers                                                             |
| --------------------------- | ---------------------------------------------------------------------------- |
| **DSA**                     | LeetCode company tags, reported problems, difficulty calibrated by seniority |
| **System design**           | Prompts grounded in the company's real architecture                          |
| **Domain / technical quiz** | Rapid-fire questions on the company's actual stack                           |
| **Take-home**               | Typical assignment shape + evaluation rubric                                 |
| **Pair programming**        | Build-a-feature vs. debug-existing-code, tooling expectations                |
| **Behavioral**              | STAR questions weighted by the company's published values                    |
| **HR / culture**            | Compensation patterns, culture-fit themes, "why us"                          |
| **Full Loop**               | Fans out across categories within the same effort cap                        |

**Format discovery is dynamic.** The plan stage always issues a loop-format query
("«company» interview process rounds"), so the report opens with the company's
real structure. If research surfaces a round the user didn't select — a debugging
round, an ML case study — the report flags it. The category list is a starting
point, not a cage.

#### Role / job description _(optional)_

A URL (extracted via Tavily), pasted text, or a free-text role. Drives seniority
calibration and stack specificity. Cheap — one extract call or a few hundred
tokens — and one of the higher-leverage optional inputs.

#### Effort level _(required, defaults to Medium)_

The single dial that ties depth and spend together. From
`EFFORT_PRESETS` in `lib/research/budget.ts`:

|                    | Low   | Medium (default) | High  |
| ------------------ | ----- | ---------------- | ----- |
| Spend cap          | $0.50 | $1.00            | $2.00 |
| Search queries     | 3–5   | 4–8              | 8–12  |
| Results per search | 4     | 5                | 8     |
| Full-page extracts | 3     | 5                | 8     |
| Questions produced | 8–15  | 15–30            | 30–50 |
| Important links    | 2–4   | 3–6              | 6–10  |

These move together by design. Raising question counts without raising the cap
starves the synthesis call; raising the cap alone buys evidence the prompt won't
use.

#### Report sections _(optional toggles)_

`company`, `loop`, `skills`, `experiences` are on by default. `recruiter` ("how
to impress the recruiter") is **opt-in** — the first section shipped this way.
Omitted sections are nulled out after synthesis, so the stored shape stays
stable across runs that predate a field.

### 3.2 After submit

1. **Credit check** — the run's dollar cap is `min(effort cap, what the balance
can pay for)`, so a run can never overdraw an account. Floors:
   `MIN_RUN_CREDITS = 50`, `MIN_EXTEND_CREDITS = 25`.
2. **Live progress** over SSE — "Found 14 interview experiences…", "Reading the
   engineering blog…". This is perceived value as much as feedback: users watch
   the work happen.
3. **Report delivered**, typically within a few minutes.
4. **Only successful runs are charged** (`researches.credits_charged` is null
   until a run settles).

### 3.3 The report

| Section                          | Contents                                                                            |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| **Company snapshot**             | What they do, stack, interview-relevant recent news                                 |
| **Loop structure**               | Discovered format, e.g. "recruiter screen → 1 DSA → 2 system design → 1 behavioral" |
| **Interviewer cards**            | Background, inferred focus areas, sourced links                                     |
| **Questions by category**        | Confidence (High/Med/Low), evidence chips, expandable prep note                     |
| **Skills**                       | What the company's screens select for                                               |
| **Recruiter section** _(opt-in)_ | How to land well with the recruiter specifically                                    |
| **Prep plan**                    | Suggested ordering — "nail these five first"                                        |
| **Feedback widget**              | Post-interview: asked / similar / not asked                                         |

### 3.4 Extending a report

An existing report can be extended — more rounds, more questions — without
re-running everything. Extensions reuse the pipeline at **half the effort's cap**
and a 25-credit floor, producing roughly one section's worth of output
(`extendCapUsd`, `lib/pricing.ts`).

### 3.5 Session retention

A user keeps their **10 most recent** runs. Starting an 11th evicts the oldest
rather than refusing the run — the sidebar is a recent-work list, not an archive.

---

## 4. Research Pipeline (core IP)

Five stages, orchestrated server-side. Gemini does the reasoning; Tavily does
retrieval.

```
[1 Plan] → [2 Gather] → [2b Proxy wave?] → [3 Compress] → [4 Synthesize] → [5 Guard & persist]
    ↓           ↓              ↓                 ↓              ↓                  ↓
 flash-lite   Tavily      Tavily (broad)     flash-lite       3.1 Pro        BudgetTracker
```

**1 — Plan** (`gemini-3.1-flash-lite-preview`). Normalises inputs, resolves the
domain, emits a structured search plan: queries tailored to the selected types,
always including the loop-format discovery query. Query count comes from the
effort preset.

**2 — Gather** (Tavily). Searches run 4-wide in parallel across company facts,
tech stack, interview intel, and each interviewer. `search_depth=advanced` is
reserved for the highest-value queries; extraction is limited to the top N URLs
per the effort preset, never everything.

**2b — Proxy wave** (`lib/research/sparsity.ts`). When direct evidence is thin —
a small or private company with no Glassdoor presence — a second, deliberately
broader wave fires against adjacent sources. Proxy pages are treated as
**context, not primary evidence**, and get a much smaller extract budget.

**3 — Compress** (`gemini-3.1-flash-lite-preview`). Each raw source becomes dense
notes (~300 tokens) with citations preserved. **This is the single biggest cost
lever** — the synthesiser never sees a raw page.

**4 — Synthesize** (`gemini-3.1-pro-preview`). One strong call over all
compressed notes with a type-specific prompt. Structured output via a response
schema so the UI renders reliably.

**5 — Guard & persist.** `BudgetTracker` accumulates real token usage plus Tavily
credits. At 85% of the run's cap it degrades (skips optional searches, caps
extracts); at 100% it stops and synthesises with what it has. **A run over budget
degrades — it never fails blank.** Cost telemetry is stored per run.

### Execution model

Research runs **inline in a Node route handler** (`app/api/research/route.ts`,
`runtime = "nodejs"`, `maxDuration = 300`), streaming SSE directly from that
route. There is no external job queue.

This is a deliberate simplification over the originally-planned Inngest setup —
one fewer moving part, and progress streaming is trivial when the work and the
stream live in the same request. **It has a real ceiling:** a large company at
high effort can approach the 300s limit. The code says so; §11 tracks it.

### Caching

| Cache                    | Scope                                         | Effect                                                       |
| ------------------------ | --------------------------------------------- | ------------------------------------------------------------ |
| **Research cache**       | `domain + interview_type`, stage-keyed, TTL'd | A re-run skips gather/compress and pays mostly for synthesis |
| **Gemini context cache** | Static system prompt + rubrics                | Cached tokens bill at a fraction of standard rate            |

---

## 5. Cost and Credit Model

### The shape of it

Users are charged the run's **real metered cost**, not a flat per-report fee.
This is the biggest change from v0.1, which assumed "$2 per research."

From `lib/pricing.ts`:

- **1 credit = $0.01** (`USD_PER_CREDIT`)
- **Markup = 1.3×** on metered cost (`CREDIT_MARKUP`) — covers payment fees and retries
- **Charge = ceil(actual_cost × 1.3 / 0.01)** credits
- **Minimum to start a run:** 50 credits. **To extend:** 25 credits.
- **Maximum a single run can cost:** 260 credits (`MAX_RUN_CREDITS`, from high
  effort's $2.00 cap × 1.3)

A typical medium-effort run costs about **$0.35** to serve and charges about
**46 credits** (~$0.46).

### Per-stage cost (design target, medium effort)

Priced against `GEMINI_PRICES` in `lib/research/budget.ts`. **Verify against
current vendor pricing before relying on these.**

| Stage                     | Model / API                         | Est. cost   |
| ------------------------- | ----------------------------------- | ----------- |
| 1. Plan                   | Gemini 3.1 Flash-Lite               | ~$0.002     |
| 2. Gather                 | Tavily (basic + advanced + extract) | ~$0.11      |
| 3. Compress (~10 sources) | Gemini 3.1 Flash-Lite               | ~$0.021     |
| 4. Synthesize             | Gemini 3.1 Pro                      | ~$0.146     |
| Retry / overhead buffer   | —                                   | ~$0.07      |
| **Total**                 |                                     | **≈ $0.35** |

Headroom to medium's $1.00 cap absorbs Full Loop fan-out, a proxy wave on a
thin-evidence company, and vendor price drift.

### Why metering instead of a flat fee

1. **Honest pricing.** A cheap run costs the user less. A $1 starter pack buying
   "about two reports" is a truthful claim, not a rounded one.
2. **Effort becomes a real choice.** Users who want a quick scan pay for a quick
   scan.
3. **Costs can't silently invert margin.** The charge is derived from spend, so
   an expensive company can't be sold at a loss.

The trade-off is that "about N reports" is approximate, which the pricing copy
states plainly.

---

## 6. Business Model

### Credit packs

Presentational config in `config/pricing.ts`; grants in `lib/packs.ts`.

| Pack        | Price | Credits | Rate              | ≈ Reports |
| ----------- | ----- | ------- | ----------------- | --------- |
| **Starter** | $1    | 100     | 100/$             | ~2        |
| **Bundle**  | $5    | 550     | 110/$ (10% bonus) | ~11       |
| **Max**     | $10   | 1200    | 120/$ (20% bonus) | ~26       |

All packs unlock the same product — they differ only in credit volume. No
subscription.

### Referrals

Two nullable columns on `users` plus the ledger — no separate table
(`lib/referrals.ts`).

- Referrer earns **100 credits** when a referred user first purchases
- Referred user earns **50 credits** on that same purchase
- Capped at **10 rewarded referrals** per account, bounding abuse at $10 of
  granted value even if fully farmed
- Codes are 8 chars from a 31-letter alphabet with look-alikes removed, generated
  lazily on first visit to the referrals page

### Future streams (not built)

Deeper "Pro" research tier; B2B API for bootcamps and recruiters.

---

## 7. Competitive Landscape

| Competitor        | What they do                            | Gap we exploit                                            |
| ----------------- | --------------------------------------- | --------------------------------------------------------- |
| **LeetCode**      | Algorithmic practice bank               | Generic; not company-specific                             |
| **Glassdoor**     | Reviews, salary, some interview reports | Anecdotal, scattered, unstructured — we read it _for_ you |
| **Pramp**         | Peer mock interviews                    | Practice format, no company research                      |
| **Exponent**      | Prep courses                            | Template content, not personalised                        |
| **Human coaches** | 1-on-1 prep                             | Doesn't scale; priced far above an impulse purchase       |

_Competitor pricing is deliberately omitted — it hasn't been verified._

### What's actually defensible

1. **Company- and interviewer-specific**, grounded in real public evidence
2. **Evidence-backed confidence** — every question links to its source; thin
   evidence lowers the score honestly rather than being padded
3. **Metered cost model** — enables sub-$1 impulse pricing without margin risk
4. **Full taxonomy** — system design, behavioral, take-home, domain quiz, not
   only DSA
5. **Cost engineering as a moat** — the compress stage and effort presets are
   what make the unit economics work at this price point

---

## 8. Tech Stack

### Application

| Layer          | Choice                                                   | Notes                                                                                        |
| -------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Framework      | **Next.js 16.2.10** + React 19.2.4                       | Breaking changes vs. common docs — read `node_modules/next/dist/docs/` first (see AGENTS.md) |
| Language       | TypeScript 5                                             |                                                                                              |
| UI             | Tailwind CSS 4 + shadcn/ui (Base UI) + lucide-react      |                                                                                              |
| Auth           | **better-auth**                                          | Google OAuth + email                                                                         |
| Database       | **Postgres** + Drizzle ORM (`postgres` driver, not `pg`) |                                                                                              |
| Long jobs      | **None** — inline route handler, `maxDuration = 300`     | Inngest was planned and dropped; see §11 for the ceiling                                     |
| Streaming      | SSE direct from the route handler                        |                                                                                              |
| Payments       | **Dodo Payments**                                        | Checkout + `/api/webhook/dodo-payments`; ledger-backed credits                               |
| Env validation | `@t3-oss/env-nextjs`                                     |                                                                                              |
| Hosting        | Vercel + managed Postgres                                |                                                                                              |

### AI layer

| Concern        | Choice                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| LLM            | Google Gemini — `gemini-3.1-pro-preview` (synthesis), `gemini-3.1-flash-lite-preview` (plan, compress) |
| Search         | Tavily Search + Extract, called directly over REST (not MCP)                                           |
| Prompt caching | Gemini explicit context caching for static prompt + rubrics                                            |
| Cost guard     | `BudgetTracker` reading real usage per call + Tavily credit counts                                     |

**On Tavily REST vs. MCP:** the pipeline is a fixed-shape server-side workflow.
MCP's dynamic tool discovery buys nothing here, and direct calls make credit
accounting exact — which the budget guard requires. MCP stays useful for local
prompt prototyping.

### Testing

Vitest, three projects: **node** (`lib/`, `app/`, `scripts/`), **jsdom**
(`components/`, `features/`, `hooks/`), **db** (PGlite in-process Postgres).
Playwright for e2e. Async Server Components can't be unit-tested — they're
covered by e2e.

CI order: `lint:check → format:check → tsc --noEmit → test:all`.

---

## 9. Data Model

Current schema (`lib/db/schema.ts`), abbreviated:

```
users(id, email, name, email_verified, image,
      referral_code UNIQUE, referred_by → users.id,
      marketing_email_opt_in, created_at, updated_at)

credits_ledger(id, user_id, delta, reason,
               payment_ref UNIQUE, research_id → researches.id, created_at)
    -- balance = SUM(delta); indexed on user_id

researches(id, user_id, company_domain, company_name,
           interviewers JSONB[{name, url}], interview_type,
           role_context, status, cost_cents_llm, cost_cents_search,
           credits_charged, created_at)
    -- interview_type: comma-joined categories, or "full_loop"
    -- credits_charged: null until settled; only successful runs are charged

reports(id, research_id, json_payload, share_token UNIQUE, created_at)

question_feedback(id, report_id, question_idx, verdict, created_at)
    -- verdict: asked | similar | not_asked

research_cache(key, stage, payload, expires_at)
    -- key: domain + interview_type
```

Plus better-auth's `sessions`, `accounts`, `verifications`.

Note: the ledger is the single source of truth for balances **and** for referral
rewards — there is no separate referrals table.

---

## 10. Feature Status

### Shipped

- [x] Full pipeline: company → research → report
- [x] Live SSE progress streaming
- [x] Effort levels (low / medium / high)
- [x] Pre-flight cost and duration estimate
- [x] Multi-interviewer support
- [x] Opt-in report sections (incl. recruiter section)
- [x] Sparsity detection + proxy search wave
- [x] Metered credit charging with balance-derived caps
- [x] Credit packs via Dodo Payments
- [x] Referral program
- [x] Report extension ("gather another round")
- [x] PDF / JSON export
- [x] Share links
- [x] Report history (10-session cap)
- [x] Post-interview feedback capture
- [x] Admin surface (`/admin`, `/admin/runs`)
- [x] Marketing, legal, company, and help pages

### In progress (M3)

- [ ] Evals harness against a golden set
- [ ] Accuracy reporting from feedback data
- [ ] Cache hit-rate tuning
- [ ] Interviewer-signal quality improvements

### Not doing (v1)

- Mobile apps — responsive web only
- Mock interview / voice practice
- Team or recruiter dashboards
- Direct LinkedIn scraping
- Subscriptions

---

## 11. Risks

| Risk                                        | Severity | Mitigation                                                                                                                                                                                          |
| ------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Route timeout on large companies**        | Med-High | Inline execution caps at `maxDuration = 300`. High effort on a big company can approach it. Mitigated by effort caps and degraded mode; a queue is the fix if it starts biting. **Actively watch.** |
| **LinkedIn ToS**                            | High     | Never fetch linkedin.com. Names/URLs are search seeds only. Stated in the UI.                                                                                                                       |
| **Prediction accuracy disappoints**         | High     | Framed as prep intelligence, not prophecy. Confidence scores drop honestly on thin evidence. Feedback loop drives iteration.                                                                        |
| **Thin evidence (small/private companies)** | Med      | Proxy wave broadens the search; proxy sources are marked as context, not evidence; confidence reflects it                                                                                           |
| **Hallucinated questions as fact**          | Med      | Every question carries evidence chips; unevidenced ones are labelled inferred. Never fabricate a citation.                                                                                          |
| **Vendor price changes invert margin**      | Med      | Charge is derived from metered spend, so margin holds automatically. Per-run telemetry catches drift.                                                                                               |
| **Referral farming**                        | Low      | Capped at 10 rewards/account — $10 ceiling even if fully abused                                                                                                                                     |
| **Free-tier abuse**                         | Low      | No free credits; $1 starter pack is the floor. Cheap, but not free                                                                                                                                  |
| **Model IDs are previews**                  | Low      | `-preview` suffixes will be renamed or retired. Pin and track.                                                                                                                                      |

---

## 12. Success Metrics

| Metric                       | Target                     | Status                          |
| ---------------------------- | -------------------------- | ------------------------------- |
| p90 cost per run             | ≤ effort cap               | Enforced in code                |
| p90 completion time          | ≤ 5 min                    | Bounded by `maxDuration`        |
| Prediction accuracy          | ≥ 30% marked asked/similar | **Not yet measured** — needs M3 |
| Repeat purchase rate         | ≥ 40% buy again            | **Not yet measured**            |
| Starter → Bundle/Max upgrade | TBD                        | **Not yet measured**            |

The three unmeasured rows are the point of M3. Until the feedback and evals
harness ship, this product has cost telemetry but no quality telemetry — which is
the most important gap in it.

---

## 13. Roadmap

| Phase                          | Scope                                                                 | Status         |
| ------------------------------ | --------------------------------------------------------------------- | -------------- |
| **M0 — Pipeline spike**        | CLI pipeline, cost model validation                                   | ✅ Shipped     |
| **M1 — MVP**                   | Auth, form, SSE, report page, telemetry                               | ✅ Shipped     |
| **M2 — Monetise**              | Dodo credit packs, exports, history, share links, referrals           | ✅ Shipped     |
| **M3 — Quality loop**          | Evals harness, accuracy measurement, cache tuning, interviewer signal | 🔨 In progress |
| **M4 — Scale** _(provisional)_ | Queue if timeouts bite, Pro tier, B2B API                             | Not started    |

---

## 14. Open Questions

1. **Accuracy is unmeasured.** Feedback capture is built but nothing reports on
   it. Until it does, the core value claim is unproven. Highest priority.
2. **Does the timeout ceiling actually bite?** Needs p99 duration data on
   high-effort runs before deciding whether a queue is worth reintroducing.
3. **Market sizing has never been researched.** Needed before any investor
   conversation; do not invent it.
4. **Competitor pricing unverified.** Same.
5. **Is 1.3× the right markup?** Chosen to cover fees and retries — never
   validated against actual refund and retry rates.
6. **Public report pages for SEO?** Growth loop vs. candidate privacy.
   _Lean: private by default, opt-in public with names redacted._
7. **Is the 10-session cap right?** Cheap to raise; nobody has complained, but
   nobody has been asked either.
