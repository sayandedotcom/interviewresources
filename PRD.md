# PRD — Interview Question Guesser

**Version:** 0.1 (Draft)
**Date:** 2026-07-09
**Owner:** Sayan De
**Status:** Planning

---

## 1. Overview

**Interview Question Guesser** is a SaaS that predicts the questions a candidate is likely to face in an upcoming interview. The user provides:

1. **Company** — a URL (preferred) or company name
2. **Interviewer** — name and/or LinkedIn profile URL _(optional)_
3. **Interview type** — DSA, System Design, Technical (domain), Behavioral, HR/Culture, Take-home _(optional but strongly nudged)_
4. **Role / job description link** _(optional, improves accuracy significantly)_

The system then runs an automated research pipeline (Tavily search/extract + Claude) that investigates the company's product, tech stack, engineering culture, publicly reported interview experiences, and the interviewer's background — and produces a ranked, categorized list of **predicted interview questions with suggested answers/prep notes and confidence scores**.

### One-line pitch

> "Paste the company link, get the questions before they ask them."

### Hard constraint

**Each research run must cost ≤ $1.00 in variable cost (LLM tokens + search API credits), targeting ~$0.70–0.85 with margin for retries.** The cost model in §7 is the contract every implementation decision must satisfy.

---

## 2. Problem Statement

Candidates prepare for interviews by manually stitching together Glassdoor reviews, LeetCode company tags, Blind threads, the company's engineering blog, and the interviewer's LinkedIn. This takes hours, is easy to do badly, and the information is scattered and stale. Existing prep tools are either generic question banks (not company-specific) or expensive human coaching.

**Who feels this pain:** job seekers in tech (primary), career switchers, new grads, and eventually recruiters/bootcamps (B2B).

---

## 3. Goals & Non-Goals

### Goals (v1)

- G1: Produce 15–30 predicted questions per run, grouped by category, each with a confidence score, "why we think this" evidence citations, and a short prep hint.
- G2: Keep variable cost per research ≤ $1.00, enforced programmatically (budget guard, not just hope).
- G3: Research completes in ≤ 3–5 minutes with live progress streaming to the UI.
- G4: Persist reports so users can revisit, share (private link), and export (PDF/Markdown).
- G5: Simple credit-based monetization from day one.

### Non-Goals (v1)

- Mock interview / voice practice mode (v2 candidate).
- Scraping LinkedIn directly (ToS risk — we only use public web search results _about_ the person; see §11).
- Guaranteeing the exact questions. This is probabilistic preparation, and the UI must frame it that way.
- Mobile apps. Responsive web only.
- Team/recruiter dashboards (v2).

---

## 4. User Stories

| #   | Story                                                                                                                                                                    | Priority |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| U1  | As a candidate, I paste `stripe.com` + "System Design" and get likely system-design questions grounded in Stripe's actual architecture (payments, idempotency, ledgers). | P0       |
| U2  | As a candidate, I add my interviewer's name/LinkedIn URL and the predictions skew toward that person's skill areas, talks, and blog posts.                               | P0       |
| U3  | As a candidate, I watch research progress live ("Searching Glassdoor experiences… Reading engineering blog…") instead of a spinner.                                      | P0       |
| U4  | As a candidate, I export my report as PDF/Markdown and revisit it later from my dashboard.                                                                               | P1       |
| U5  | As a candidate, I buy a pack of research credits (e.g., 5 for $10) without a subscription.                                                                               | P0       |
| U6  | As a candidate, I flag questions that actually appeared in my interview, feeding accuracy metrics.                                                                       | P1       |
| U7  | As a returning user, re-running the same company+role within 7 days reuses cached research and costs a fraction of a credit.                                             | P1       |

---

## 5. Product Flow

```
Landing → Sign in → New Research form → (validate & normalize inputs)
   → Payment/credit check → Research pipeline (streamed progress)
   → Report page (questions, evidence, prep plan) → Export / Share / Rerun
```

### 5.1 Input form

- Company field: accepts URL or name; we resolve name→domain with one cheap search call and confirm with the user ("Did you mean Stripe — stripe.com?") before burning the credit.
- Interviewer field: free text name and/or LinkedIn URL. We never log into LinkedIn; the URL is only used as a search seed ("site-restricted and name-based public search").
- Interview type: chips covering the full taxonomy in §5.3 (DSA, System Design, Domain/Technical Quiz, Take-home, Pair Programming, Behavioral, HR/Culture) plus "Full Loop". "Full Loop" fans out across categories but must stay inside the same $1 budget (fewer questions per category).
- The type list is a starting point, not a cage: the research pipeline **discovers the company's actual loop format** (see §5.3) and can surface categories the user didn't select ("Glassdoor reports Stripe includes a debugging round — add it?").
- Optional: job description URL or pasted text, seniority level, tech stack the user was told about.

### 5.2 Report page

- Header: company snapshot (what they do, stack, recent news relevant to interviews).
- Interviewer card (if provided): background summary, inferred focus areas, sourced links.
- Question list: grouped by category → each question shows **confidence (High/Med/Low)**, **evidence chips** (links to the Glassdoor thread / blog post / LeetCode tag that motivated it), and an expandable **prep note** (what a strong answer covers).
- Prep plan: a suggested ordering ("nail these 5 first").
- Feedback: per-question "was asked / similar was asked / not asked" post-interview.

### 5.3 Interview category taxonomy

The system covers every common interview format. Prediction shape differs per category — a "question list" is the wrong output for some of them:

| Category                            | What we predict                                                                                                                                  | Output shape                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| **Algorithmic coding (DSA)**        | Likely problems/patterns from LeetCode company tags, Glassdoor reports, difficulty calibration by level                                          | Problem patterns + representative problems + "practice these 10"  |
| **System design (scalability)**     | Design prompts grounded in the company's real architecture (e.g., payments ledger at Stripe, feed ranking at a social co)                        | Design prompts + key trade-offs the interviewer will probe        |
| **Domain-specific quiz**            | Rapid-fire technical questions on the company's actual stack (from job postings, eng blog, GitHub) — e.g., React internals, Postgres tuning, K8s | Q&A list grouped by technology                                    |
| **Take-home project**               | Typical assignment shape reported by past candidates + evaluation rubric (what reviewers look for)                                               | Likely brief + grading criteria + common failure modes            |
| **Pair programming / live coding**  | Collaboration format, whether it's build-a-feature vs. debug-existing-code, tooling expectations                                                 | Format brief + likely task types + collaboration signals assessed |
| **Behavioral**                      | STAR-style questions weighted by the company's published values/leadership principles (e.g., Amazon LPs)                                         | Questions + which value each maps to + answer scaffold            |
| **HR / culture / recruiter screen** | Compensation-talk patterns, culture-fit themes, "why us" specifics                                                                               | Questions + suggested talking points                              |

**Format discovery (dynamic):** the Plan stage explicitly searches for the company's interview _process_ ("«company» interview process rounds"), so the report opens with the likely loop structure (e.g., "1 recruiter screen → 1 DSA → 2 system design → 1 bar-raiser behavioral"). If research reveals a format the user didn't select — debugging rounds, ML case studies, whiteboard architecture, culture-add panels — the report flags it. Categories are data-driven from what the internet reports about this company, not hardcoded.

---

## 6. Research Pipeline (Core IP)

A server-side agentic pipeline. **Gemini is the orchestrator with function calling; Tavily is the search/extract layer** (via the Tavily MCP server or direct REST API — see decision in §8.4).

### Stages

1. **Plan (cheap, Gemini 3.1 Flash-Lite)** — Normalize inputs, resolve company domain, and generate a research plan: 4–8 targeted search queries tailored to the interview type, always including one **loop-format discovery query** ("«company» interview process rounds") so the report reflects the company's real interview structure (§5.3). Output is structured JSON (search budget allocation per angle).
2. **Gather (Tavily)** — Execute searches in parallel:
   - Company: what they do, product lines, scale signals, funding/news.
   - Tech stack: engineering blog, job postings, StackShare-style pages, GitHub org.
   - Interview intel: "«company» interview questions «type»", Glassdoor/Blind/LeetCode-discuss results.
   - Interviewer (if given): public talks, blog posts, GitHub, publications, "«name» «company»" search.
   - Use `search_depth=advanced` only for the 2–3 highest-value queries; `basic` elsewhere. Use Tavily Extract on the top 3–5 URLs (raw page content), not everything.
3. **Compress (cheap, Gemini 3.1 Flash-Lite)** — Summarize each raw source into dense notes (~300 tokens each) with citations preserved. This is the single biggest cost lever: the synthesizer never sees raw pages.
4. **Synthesize (Gemini 3.1 Pro)** — One strong call with all compressed notes + interview-type-specific prompt → produces the final structured report: questions, confidence, evidence mapping, prep notes. Structured output via `responseSchema` (JSON schema) so the UI renders reliably.
5. **Guard & persist** — A budget tracker accumulates actual token usage (`response.usage`) + Tavily credits per stage; if a run trends over budget mid-flight, the pipeline degrades gracefully (skip advanced re-searches, cap extract calls) rather than failing. Store report + per-run cost telemetry.

### Streaming UX

Each stage emits progress events over SSE to the client ("Found 12 interview experiences on Glassdoor", "Reading Stripe engineering blog…"). This doubles as perceived-value: users see the work.

### Caching (cost + speed)

- **Company research cache (7 days):** stages 1–3 keyed by `domain + interview_type`. A cache hit means a rerun only pays for stage 4 (~$0.15) — enables U7 and cheap "Full Loop" fan-out.
- **Gemini context caching:** the large static system prompt + interview-type rubrics go into a cached context (explicit caching); compressed notes are the per-request suffix. Cached tokens bill at ~0.1× (≈90% savings).

---

## 7. Cost Model (the $1 contract)

Prices as of 2026-07 — Gemini API: Gemini 3.1 Pro $2/$12 per MTok, Gemini 3.5 Flash $1.50/$9, Gemini 3 Flash $0.50/$3, Gemini 3.1 Flash-Lite $0.25/$1.50. Tavily: ~$0.008/credit pay-as-you-go (basic search = 1 credit, advanced = 2, extract = 1 per 5 URLs) — **verify current Tavily and Gemini pricing at implementation time.**

| Stage                       | Model / API                                    | Input tokens | Output tokens |   Est. cost |
| --------------------------- | ---------------------------------------------- | -----------: | ------------: | ----------: |
| 1. Plan                     | Gemini 3.1 Flash-Lite                          |           3K |            1K |      $0.002 |
| 2. Gather                   | Tavily: 6 basic + 3 advanced + 2 extract calls |            — |             — |      ~$0.11 |
| 3. Compress (×~10 sources)  | Gemini 3.1 Flash-Lite                          |          60K |            4K |      $0.021 |
| 4. Synthesize               | Gemini 3.1 Pro                                 |          25K |            8K |      $0.146 |
| Retry/overhead buffer (25%) | —                                              |            — |             — |      ~$0.07 |
| **Total**                   |                                                |              |               | **≈ $0.35** |

Headroom to $1.00 is deliberate (~$0.65 spare): it absorbs a "Full Loop" fan-out (multiple synthesize calls), an extra advanced-search round when initial results are thin, or future price changes. **Hard enforcement:** a per-run `BudgetTracker` sums real usage; at $0.85 the pipeline enters degraded mode, at $1.00 it stops and synthesizes with what it has.

**Pricing implication:** at ≤$1 COGS, selling credits at **$2/research (packs: 5 for $8, 12 for $18)** yields healthy gross margin while staying an impulse purchase. One free research on signup (rate-limited, cache-friendly companies) as the acquisition hook.

> Model choice note: Gemini 3.5 Flash ($1.50/$9) can likely handle synthesis at ~$0.11/call — worth A/B testing against 3.1 Pro in the M0 spike; if quality holds, total run cost drops to ~$0.30. Conversely, a "Pro research" tier could use a bigger token budget on 3.1 Pro (deeper extraction, more sources) at 2 credits and still fit under $1.

---

## 8. Tech Stack

### 8.1 Application

| Layer               | Choice                                                                                     | Rationale                                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework           | **Next.js 16.2.10** (already scaffolded in this repo)                                      | Full-stack: UI + API routes + streaming. ⚠️ This Next.js version has breaking changes vs. common docs — read `node_modules/next/dist/docs/` before writing code (per repo AGENTS.md). |
| Language            | TypeScript 5                                                                               | Already configured                                                                                                                                                                    |
| UI                  | Tailwind CSS 4 + shadcn/ui (Base UI variant, already installed) + lucide-react             | Already in repo                                                                                                                                                                       |
| Auth                | **Better Auth** (or Clerk if faster to ship)                                               | Email + Google OAuth; session-based credit checks                                                                                                                                     |
| Database            | **Postgres (Neon or Supabase)** + Drizzle ORM                                              | Reports, users, credits, cost telemetry, cache entries                                                                                                                                |
| Queue / long jobs   | **Inngest** (or Trigger.dev)                                                               | Research runs take 2–5 min — must survive serverless timeouts; gives retries, step functions, and per-step observability for free                                                     |
| Streaming to client | SSE from a route handler, fed by job progress events (Inngest realtime or a Redis pub/sub) | Live progress UX                                                                                                                                                                      |
| Payments            | **Stripe** (Checkout + credit ledger table)                                                | Credit packs, no subscription complexity in v1                                                                                                                                        |
| Hosting             | Vercel (app) + Neon (DB)                                                                   | Fast to ship; Inngest handles the long-running part Vercel can't                                                                                                                      |
| Analytics/telemetry | PostHog + per-run cost table                                                               | Track cost-per-run distribution obsessively                                                                                                                                           |

### 8.2 AI layer

| Concern         | Choice                                                                                                                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LLM             | **Google Gemini** via `@google/genai` SDK — Gemini 3.1 Pro for synthesis, Gemini 3.1 Flash-Lite for plan/compress. Thinking enabled on synthesis; `responseSchema` (structured output) for reliable report JSON. |
| Search/research | **Tavily** — Search + Extract APIs                                                                                                                                                                               |
| Prompt caching  | Gemini explicit context caching for static system prompt + rubrics (~90% discount on cached tokens)                                                                                                              |
| Cost guard      | Custom `BudgetTracker` reading `usageMetadata` per call + Tavily credit counts                                                                                                                                   |

### 8.3 Evals (don't skip)

A small golden set (10 companies × 3 interview types) with human-rated report quality, re-run on every prompt change. Post-interview feedback (U6) becomes the long-term accuracy metric ("% of predicted questions marked asked/similar").

### 8.4 Tavily: MCP vs direct API — decision

The user's instinct was the **Tavily MCP server**. Recommendation: **use the Tavily REST API directly (via their JS SDK) in v1**, because:

- The pipeline is a _server-side, fixed-shape_ workflow — MCP's dynamic tool discovery buys nothing here and adds a moving part.
- Direct calls make credit accounting exact (the $1 guard needs to know cost _before_ each call).
- Gemini's function-calling works with plain function declarations; wiring an MCP client into the server adds a dependency without benefit for a fixed pipeline.
- MCP remains great for local prototyping in Claude Code/Desktop while designing prompts — use it there, ship the API.

If we later expose an open-ended "deep research" agent mode, revisit MCP.

---

## 9. Data Model (sketch)

```
users(id, email, name, created_at)
credits_ledger(id, user_id, delta, reason, stripe_ref, created_at)   -- balance = SUM(delta)
researches(id, user_id, company_domain, company_name, interviewer_name,
           interviewer_url, interview_type, role_context, status,
           cost_cents_llm, cost_cents_search, created_at)
reports(id, research_id, json_payload, share_token, created_at)
question_feedback(id, report_id, question_idx, verdict, created_at)  -- asked/similar/not
research_cache(key, stage, payload, expires_at)                      -- domain+type keyed
```

---

## 10. API Surface (v1)

| Route                       | Method    | Purpose                                                           |
| --------------------------- | --------- | ----------------------------------------------------------------- |
| `/api/research`             | POST      | Validate inputs, check credits, enqueue job, return `research_id` |
| `/api/research/[id]/events` | GET (SSE) | Live progress stream                                              |
| `/api/research/[id]`        | GET       | Final report JSON                                                 |
| `/api/reports`              | GET       | User's report history                                             |
| `/api/reports/[id]/export`  | GET       | PDF/Markdown export                                               |
| `/api/feedback`             | POST      | Per-question post-interview feedback                              |
| `/api/checkout`             | POST      | Stripe checkout session for credit packs                          |
| `/api/webhooks/stripe`      | POST      | Credit fulfillment                                                |

---

## 11. Risks & Mitigations

| Risk                                                  | Severity | Mitigation                                                                                                                                                      |
| ----------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LinkedIn ToS — scraping profiles                      | High     | Never fetch linkedin.com directly. Use the name/URL only as a public web-search seed (talks, GitHub, blogs, conference pages). State this in the UI.            |
| Glassdoor/Blind anti-bot walls → thin interview intel | Med      | Tavily handles retrieval; diversify sources (LeetCode discuss, Reddit r/csMajors, interviewing.io blog); confidence scores drop honestly when evidence is thin. |
| Hallucinated questions presented as fact              | Med      | Every question carries evidence chips; questions without evidence are labeled "inferred from role/stack" — never fabricate a citation.                          |
| Cost blowout on huge companies (Google, Amazon)       | Med      | BudgetTracker degraded mode; for FAANG-tier companies lean harder on cache (they're the most-requested and best-cached).                                        |
| Tavily/Gemini price changes                           | Low      | Cost telemetry per run + alert when p90 run cost > $0.85.                                                                                                       |
| Prediction accuracy disappoints users                 | High     | Frame as "prep intelligence," not prophecy; feedback loop (U6) + evals drive iteration; refund a credit on clearly-broken runs.                                 |

---

## 12. Success Metrics

- **Cost:** p90 variable cost per research ≤ $0.85; p100 ≤ $1.00 (hard).
- **Quality:** ≥ 30% of questions marked "asked/similar" by feedback submitters within 3 months.
- **Speed:** p90 research completion ≤ 5 min.
- **Business:** free→paid conversion ≥ 8%; ≥ 40% of buyers purchase a second pack.

---

## 13. Milestones

| Phase               | Scope                                                                                               | Target   |
| ------------------- | --------------------------------------------------------------------------------------------------- | -------- |
| M0 — Pipeline spike | CLI-only pipeline: inputs → Tavily → Claude → JSON report; validate cost model on 10 real companies | Week 1–2 |
| M1 — MVP            | Auth, research form, SSE progress, report page, 1 free credit, cost telemetry                       | Week 3–5 |
| M2 — Monetize       | Stripe credit packs, exports, report history, share links                                           | Week 6–7 |
| M3 — Quality loop   | Feedback capture, evals harness, caching (U7), interviewer-signal improvements                      | Week 8+  |

**M0 is the gate:** if the $1 cost model or report quality doesn't hold on real companies, revisit the pipeline before building any UI.

---

## 14. Open Questions

1. Should "Full Loop" cost 1 credit (degraded depth) or 2 credits (full depth per category)? _Lean: 2 credits, clearly labeled._
2. Free-tier abuse: device fingerprinting vs. email verification only?
3. Do we let users pick the model tier (Standard = Flash-based synthesis, Pro = 3.1 Pro with a deeper research budget at 2 credits)?
4. Report sharing: public SEO-indexable pages (growth loop) vs. private-only (candidate privacy)? _Lean: private by default, opt-in public with company/interviewer names redacted._
