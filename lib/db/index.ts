import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/env";

const connectionString = env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set — copy .env.example to .env.local and fill it in.");
}

const client = postgres(connectionString);

export const db = drizzle(client, { schema });
