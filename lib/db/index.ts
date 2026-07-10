import { env } from "@/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set — copy .env.example to .env.local and fill it in.");
}

// Tuned for serverless: every concurrent function instance gets its own client,
// so a default pool of 10 would exhaust the database's connection limit. One
// connection each, and let the platform's pooler (Neon's PgBouncer) do the
// pooling. `prepare: false` is mandatory against that pooler — it runs in
// transaction mode, where prepared statements do not survive between queries.
const client = postgres(connectionString, {
  max: 1,
  prepare: false,
  idle_timeout: 20,
});

export const db = drizzle(client, { schema });
