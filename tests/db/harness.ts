import { PGlite } from "@electric-sql/pglite";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import { drizzle } from "drizzle-orm/pglite";

import * as schema from "@/lib/db/schema";

/**
 * A real Postgres, in-process, per test file.
 *
 * The DDL is generated from `schema.ts` rather than replayed from `drizzle/`,
 * because that migration folder has drifted from the schema (it still declares
 * `credits_ledger.stripe_ref`). Generating means these tests exercise the
 * constraints the code actually assumes — in particular the unique index on
 * `payment_ref` that makes `grantCredits` idempotent.
 *
 * Limitation: PGlite serves one connection, so it serialises statements. It
 * proves the unique constraint and the `for update` lock are *there*, but it
 * cannot prove they hold under genuine parallelism — two `chargeCredits` calls
 * racing on the same row never actually overlap here. To test that (and the
 * negative balance it is meant to prevent), swap this harness for
 * `@testcontainers/postgresql`, which gives a real multi-connection server.
 */
export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  const statements = await generateMigration(
    generateDrizzleJson({}),
    generateDrizzleJson(schema as Record<string, unknown>)
  );

  for (const statement of statements) {
    await client.exec(statement);
  }

  return db;
}

/** Truncates every table between tests, keeping the (slow) schema build once per file. */
export async function resetDb(db: TestDb): Promise<void> {
  await db.execute(
    `truncate table product_events, payment_refunds, payments, question_feedback,
     reports, credits_ledger, researches,
     sessions, accounts, verifications, research_cache, users restart identity cascade`
  );
}

export async function seedUser(
  db: TestDb,
  overrides: Partial<typeof schema.users.$inferInsert> = {}
): Promise<string> {
  const [row] = await db
    .insert(schema.users)
    .values({
      email: `u${Math.random().toString(36).slice(2)}@example.com`,
      name: "Test",
      ...overrides,
    })
    .returning({ id: schema.users.id });
  return row.id;
}
