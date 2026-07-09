import { defineConfig, devices } from "@playwright/test";

/**
 * E2E covers what Vitest structurally cannot:
 *
 * - `app/(app)/prepare/[id]/page.tsx` is an async Server Component, which
 *   Vitest cannot render (see the Next.js testing guide). Its `userId` scoping
 *   is the only thing stopping one user reading another's report, so it is
 *   verified here against a real server.
 * - Google OAuth via better-auth, and Dodo's webhook signature verification.
 *
 * These need a real database and a built app, so they are not part of
 * `pnpm test`. Point DATABASE_URL at a scratch database and run `pnpm test:e2e`.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
