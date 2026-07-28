import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const MIGRATION_LOCK_ID = 7_244_091_517;

export interface MigrationEnvironment {
  VERCEL?: string;
  VERCEL_ENV?: string;
  DATABASE_URL_UNPOOLED?: string;
}

export function migrationDecision(
  env: MigrationEnvironment
): { action: "skip"; reason: string } | { action: "run"; url: string } {
  if (env.VERCEL === "1" && env.VERCEL_ENV !== "production") {
    return { action: "skip", reason: `Vercel ${env.VERCEL_ENV ?? "unknown"} environment` };
  }
  if (!env.DATABASE_URL_UNPOOLED) {
    throw new Error(
      "DATABASE_URL_UNPOOLED is required for migrations; pooled DATABASE_URL is never used."
    );
  }
  return { action: "run", url: env.DATABASE_URL_UNPOOLED };
}

type SqlClient = ReturnType<typeof postgres>;

/**
 * Runs migration discovery and DDL while holding a session advisory lock.
 * `max: 1` guarantees Drizzle's discovery query and transaction stay on the
 * same locked PostgreSQL session.
 */
export async function runMigrations(
  env: MigrationEnvironment,
  deps: {
    connect?: (url: string) => SqlClient;
    migrate?: typeof migrate;
    makeDatabase?: (client: SqlClient) => Parameters<typeof migrate>[0];
  } = {}
): Promise<"skipped" | "migrated"> {
  const decision = migrationDecision(env);
  if (decision.action === "skip") {
    console.log(`Skipping database migrations in ${decision.reason}.`);
    return "skipped";
  }

  const client =
    deps.connect?.(decision.url) ??
    postgres(decision.url, { max: 1, prepare: false, idle_timeout: 20 });
  const migrateDatabase = deps.migrate ?? migrate;
  let locked = false;
  try {
    await client`select pg_advisory_lock(${MIGRATION_LOCK_ID})`;
    locked = true;
    const database = deps.makeDatabase?.(client) ?? drizzle(client);
    await migrateDatabase(database, { migrationsFolder: "./drizzle" });
    console.log("Migrations applied (or already up to date).");
    return "migrated";
  } finally {
    if (locked) await client`select pg_advisory_unlock(${MIGRATION_LOCK_ID})`;
    await client.end();
  }
}
