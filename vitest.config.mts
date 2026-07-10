import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * Two projects, because this app has two very different kinds of code:
 *
 * - `node`  — credits math, budget tracking, the pipeline, and the route
 *             handlers. These are plain modules and Web-standard Request/
 *             Response; they must not run in jsdom, whose fetch/Response
 *             shims diverge from the Node ones Next actually uses.
 * - `jsdom` — React components.
 *
 * Async Server Components (`app/(app)/prepare/[id]/page.tsx`) are deliberately
 * absent from both: Vitest cannot render them yet, so their auth scoping is
 * covered by the Playwright suite instead. See the Next.js testing guide in
 * node_modules/next/dist/docs/01-app/02-guides/testing/index.md.
 */
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    env: {
      // lib/db/index.ts throws at import when this is missing. postgres.js
      // connects lazily, so a dummy URL never opens a socket.
      DATABASE_URL: "postgres://test:test@localhost:5432/test",
      NEXT_PUBLIC_SITE_URL: "https://test.local",
      DODO_PAYMENTS_API_KEY: "test_bearer",
      DODO_PAYMENTS_WEBHOOK_KEY: "whsec_dGVzdF93ZWJob29rX2tleQ==",
      DODO_PRODUCT_ID_STARTER: "prod_starter",
      DODO_PRODUCT_ID_BUNDLE: "prod_bundle",
      DODO_PRODUCT_ID_MAX: "prod_max",
      TAVILY_API_KEY: "tvly-test",
      GOOGLE_GENERATIVE_AI_API_KEY: "test-gemini-key",
      // better-auth warns on construction without these, even when mocked out.
      GOOGLE_CLIENT_ID: "test-client-id",
      GOOGLE_CLIENT_SECRET: "test-client-secret",
      BETTER_AUTH_SECRET: "test-secret",
    },
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["{lib,app,scripts}/**/*.test.{ts,tsx}", "tests/unit/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          environment: "jsdom",
          setupFiles: ["./tests/setup/jsdom.ts"],
          include: ["{components,features,hooks}/**/*.test.{ts,tsx}"],
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          environment: "node",
          include: ["tests/db/**/*.test.ts"],
          // PGlite boots a real Postgres per file — give the WASM cold start
          // and the generated DDL room to breathe.
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
