# Interview Resources

Predicts likely interview questions for a specific company (and, optionally,
a specific interviewer) by researching the web and synthesizing a report
with Gemini. Full product spec: [`PRD.md`](./PRD.md).

> ⚠️ This project uses **Next.js 16.2.10**, which has breaking changes vs.
> older Next.js docs/training data (e.g. `middleware.ts` → `proxy.ts`). Read
> `node_modules/next/dist/docs/` before changing framework-level code — see
> [`AGENTS.md`](./AGENTS.md).

## Current status

We're between **M0 and M1** (PRD §13). What exists today:

- ✅ A standalone research pipeline (`lib/research/`) — plan → gather →
  compress → synthesize → budget guard — runnable via CLI.
- ✅ A web UI (`app/`) — the "Interview Resources" research form, live SSE
  progress feed, and the report page (PRD §5), wired to the pipeline
  through `app/api/research`.
- ✅ A Postgres schema (`lib/db/schema.ts`) matching PRD §9, not yet wired
  into the app.
- ⏳ Auth, credit purchases, and the job queue (M1/M2) are not built yet.
  The research API runs the pipeline inline in the route handler for now;
  on serverless this will hit platform timeouts for large companies, which
  is exactly why the Inngest job queue is planned (PRD §8.1).

## Prerequisites

- Node.js 22+
- pnpm 10+
- A [Google AI Studio](https://aistudio.google.com/apikey) API key (Gemini)
- A [Tavily](https://app.tavily.com) API key
- Postgres (only needed once you go past the CLI — e.g. [Neon](https://neon.tech))

## Setup

```bash
pnpm install
cp .env.example .env.local
```

Fill in `.env.local`:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=...   # required — Gemini
TAVILY_API_KEY=...                 # required — web research
DATABASE_URL=...                   # only needed for db:* scripts
```

## Run the research pipeline (M0)

This is the core product logic today — a CLI that runs the full pipeline
against a real company and prints the report plus an exact cost breakdown,
so you can validate quality and the $1 budget cap (PRD §7) before anything
else gets built.

```bash
pnpm research -- --company "Stripe" --url https://stripe.com --types system_design,dsa
```

Options:

| Flag                | Required                         | Example                                                            |
| ------------------- | -------------------------------- | ------------------------------------------------------------------ |
| `--company`         | yes                              | `"Stripe"`                                                         |
| `--url`             | no                               | `https://stripe.com`                                               |
| `--types`           | no (default `dsa,system_design`) | `dsa,system_design,behavioral` — see valid values below            |
| `--interviewer`     | no                               | `"Jane Doe"`                                                       |
| `--interviewer-url` | no                               | a public profile/portfolio URL, **not** scraped LinkedIn (PRD §11) |
| `--role`            | no                               | free-text role/JD context                                          |

Valid `--types` values (PRD §5.3): `dsa`, `system_design`, `domain_quiz`,
`take_home`, `pair_programming`, `behavioral`, `hr_culture`.

The command prints live stage progress, the final report JSON, and a cost
breakdown per stage with the total checked against the $1.00 cap:

```
[plan] Building research plan...
[gather] Searching: Stripe interview questions system design...
[compress] Summarizing: Stripe Engineering Blog...
[synthesize] Synthesizing final report...
[done] Done. Total cost: $0.3421

===== REPORT =====
{ ... }

===== COST BREAKDOWN =====
  [plan] llm — gemini-3.1-flash-lite (3021in/612out) — $0.0017
  ...
  TOTAL: $0.3421 (cap: $1.00)
```

## Database (optional right now)

Only needed once you start wiring up the app beyond the CLI:

```bash
pnpm db:push      # push lib/db/schema.ts to DATABASE_URL
pnpm db:studio    # browse the DB
```

## Web app

```bash
pnpm dev
```

Opens the app at [http://localhost:3000](http://localhost:3000): the
Interview Resources research form. Fill it in, run the research, and watch
the live progress feed as the pipeline works, then read the report inline.
Requires `GOOGLE_GENERATIVE_AI_API_KEY` and `TAVILY_API_KEY` in
`.env.local` — without them the run fails on the first stage with a clear
message. `pnpm research` (CLI) does the same thing headless with a full
cost breakdown.

## Project structure

```
app/                   # web UI (PRD §5)
  page.tsx              home — hero + research experience
  research-experience.tsx  "use client" — form, SSE progress feed, report view
  layout.tsx            fonts (Space Grotesk / Geist / Geist Mono) + metadata
  api/research/route.ts POST — runs the pipeline, streams progress + report over SSE
lib/research/          # the pipeline — plan, gather, compress, synthesize, budget guard
  types.ts              interview category taxonomy + zod schemas (input/plan/report)
  display.ts             UI labels/codes for categories + confidence
  budget.ts               BudgetTracker — enforces the $1 cap, Gemini/Tavily pricing table
  tavily.ts                direct Tavily REST client (search + extract)
  gemini.ts                 AI SDK wrapper (generateObject + usage tracking)
  pipeline.ts                the 4 stages, orchestrated
scripts/research.ts    CLI entry point for the pipeline (M0)
lib/db/                 Drizzle schema + client (PRD §9), not yet wired to routes
drizzle.config.ts      drizzle-kit config
PRD.md                 full product spec — read this first for the "why"
AGENTS.md              Next.js 16 usage notes (read before touching app/ routing)
```

## Tech stack

See [PRD §8](./PRD.md#8-tech-stack). In short: Next.js 16 + TypeScript +
Tailwind/shadcn, Postgres via Drizzle, Gemini via the Vercel AI SDK
(`ai` + `@ai-sdk/google`), Tavily for web research, Stripe for credit packs
and Inngest for the long-running research job queue (both planned, not yet
integrated).

Production deployment and launch verification are documented in
[`docs/deployment.md`](docs/deployment.md).
