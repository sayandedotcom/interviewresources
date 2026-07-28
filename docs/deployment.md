# Vercel Pro production deployment

Vercel Git integration owns deployments. Pull requests must pass the GitHub `quality` and `e2e`
checks before merge; a successful Vercel build is not a substitute for CI.

## Environment boundaries

- Production only: `DATABASE_URL_UNPOOLED`, `DODO_PAYMENTS_API_KEY`,
  `DODO_PAYMENTS_WEBHOOK_KEY`, `DODO_PAYMENTS_ENVIRONMENT=live_mode`, all
  `DODO_PRODUCT_ID_*` values, and `CRON_SECRET`.
- Preview: use an isolated pooled preview database only when application testing needs one. Never
  expose the production direct database URL or production Dodo credentials to Preview.
- `DATABASE_URL` is the pooled Neon endpoint used by runtime functions.
- `DATABASE_URL_UNPOOLED` is the direct Neon endpoint used only by production migrations.

The Vercel build command runs `pnpm db:migrate:run && pnpm build`. The migration runner skips when
`VERCEL=1` and `VERCEL_ENV` is not `production`, refuses to fall back to the pooled URL, and holds a
session-level PostgreSQL advisory lock across migration discovery and execution.

The app and database are pinned to `iad1` to keep runtime database round trips local. Migrations
must remain backward-compatible with the previously active deployment.

## Pro configuration

- Fluid Compute must remain enabled.
- `/api/research` and `/api/research/[id]/extend` have an 800-second maximum duration.
- `/api/cron/reap` runs every 15 minutes. Configure `CRON_SECRET` as a random Production-only value
  of at least 16 characters; Vercel sends it as the cron request's bearer token.
- Keep the default 2 GB / 1 vCPU function size until production measurements justify changing it.
- Configure spend alerts and a hard spend limit in the Vercel team settings before launch.

## Production checklist

1. Confirm required GitHub checks passed on the exact commit merged to `main`.
2. Confirm the Vercel Production environment has every required variable and Preview does not
   inherit the production direct database or Dodo variables.
3. Inspect build logs for `Migrations applied (or already up to date).` before activation.
4. Confirm `/api/cron/reap` appears in the Vercel Cron dashboard on a `*/15 * * * *` schedule.
5. Confirm `GET /api/cron/reap` without `Authorization: Bearer $CRON_SECRET` returns `401`.
6. Create a stuck test run in a controlled environment and confirm it is failed within 30 minutes.
7. Exercise purchase, credit grant, report, extension, account export, share, refund, and account
   deletion. Verify no duplicate ledger entries and no orphaned owned data.
8. Run at least 20 production reports: completion must be at least 95%, duplicate charges zero,
   balances non-negative, and p95 duration below 240 seconds.

The 15-minute cron and 800-second research functions depend on Vercel Pro. Operational verification
in the Vercel and Dodo dashboards is manual and must be recorded in the launch issue.
