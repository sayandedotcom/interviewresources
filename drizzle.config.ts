import "dotenv/config";
import { defineConfig } from "drizzle-kit";

import { env } from "./env";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Prefer the direct endpoint: drizzle-kit needs session-level connections,
    // which a transaction-mode pooler cannot provide.
    url: env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL ?? "",
  },
});
