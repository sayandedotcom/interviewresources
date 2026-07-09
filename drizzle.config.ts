import "dotenv/config";
import { defineConfig } from "drizzle-kit";

import { env } from "./env";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL ?? "",
  },
});
