import "dotenv/config";

import { runMigrations } from "./migrate-core";

runMigrations({
  VERCEL: process.env.VERCEL,
  VERCEL_ENV: process.env.VERCEL_ENV,
  DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
}).catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
