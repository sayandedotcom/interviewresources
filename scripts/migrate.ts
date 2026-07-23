import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Applies the committed `drizzle/` migrations. Runs as the first half of the
 * Vercel build command (`pnpm db:migrate:run && pnpm build`), so the schema is
 * guaranteed to land before the new code that depends on it goes live.
 *
 * Unlike `drizzle-kit migrate`, drizzle-orm's migrator is idempotent and exits
 * 0 when there is nothing to apply — safe to run on every deploy, including the
 * many that carry no new migration. (`drizzle-kit migrate` exits 1 in that
 * case, which a build gate must not swallow.)
 *
 * Prefers the direct (non-pooled) endpoint: migrations need session-level
 * connections, which Neon's transaction-mode pooler cannot provide. Reads
 * `process.env` directly rather than `@/env` so this plain node process does not
 * pull in the full client/server env schema.
 */
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL_UNPOOLED (or DATABASE_URL) is not set.");
  }

  const client = postgres(url, { max: 1 });
  try {
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
    console.log("Migrations applied (or already up to date).");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
