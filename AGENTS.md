<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Dev commands

```sh
pnpm dev          # start dev server
pnpm build        # production build
pnpm start        # start production server

pnpm lint:check   # eslint (quiet)
pnpm format       # prettier write
pnpm format:check # prettier check

pnpm test                    # node + jsdom projects only
pnpm test:all                # node + jsdom + db
pnpm test:db                 # db project only (PGlite in-process Postgres)
pnpm test:e2e                # Playwright e2e (requires build + DB)

pnpm db:generate  # drizzle-kit generate
pnpm db:migrate  # drizzle-kit migrate
pnpm db:push     # drizzle-kit push
pnpm db:studio   # drizzle-kit studio
```

CI order: `lint:check → format:check → tsc --noEmit → test:all`

## Testing architecture

Vitest has 3 projects:
- **node**: `lib/`, `app/`, `scripts/`, `tests/unit/` — plain Node, no jsdom
- **jsdom**: `components/`, `features/`, `hooks/` — React component tests
- **db**: `tests/db/` — PGlite in-process Postgres, `testTimeout: 30000`

Async Server Components cannot be tested in Vitest (covered by Playwright e2e).

DB tests need these env vars injected by `vitest.config.mts`: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DODO_*`, `TAVILY_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`.

## Database

- Drizzle schema: `lib/db/schema.ts`
- Migrations output: `drizzle/` (auto-generated, eslint-ignored)
- `drizzle.config.ts` prefers `DATABASE_URL_UNPOOLED` for drizzle-kit (session-level connections)
- Production migrations run via `pnpm db:migrate` after e2e passes on main

## Env setup

Copy `.env.example` to `.env`. Required for local dev:
- `DATABASE_URL` / `DATABASE_URL_UNPOOLED` — Postgres connection
- `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — auth
- `DODO_PAYMENTS_*`, `DODO_PRODUCT_ID_*` — payments
- `TAVILY_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY` — AI research

## Framework quirks

- Next.js 16.2.10 with React 19.2.4
- Tailwind CSS v4 (not v3)
- `better-auth` for authentication
- `@t3-oss/env-nextjs` for env validation
- `drizzle-orm` + `postgres` (not `pg`) for DB
- Docker: `pnpm build` with `BUILD_STANDALONE=1` produces standalone output
