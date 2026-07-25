import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";
import onlyWarn from "eslint-plugin-only-warn";
import unusedImports from "eslint-plugin-unused-imports";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,
  {
    plugins: {
      "unused-imports": unusedImports,
      onlyWarn,
    },
    rules: {
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  globalIgnores([
    // `**/` because a bare `.next/**` only matches the root build. Agent
    // worktrees under .claude/ carry their own .next, and linting one costs
    // ~4.5MB of warnings about generated Turbopack chunks on every commit.
    "**/.next/**",
    ".claude/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "drizzle/**",
    "**/node_modules/**",
  ]),
]);
