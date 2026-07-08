/**
 * M0 pipeline spike (PRD milestone M0): run the research pipeline standalone
 * against a real company and print the report + cost breakdown. This is the
 * gate — validate cost and quality here before building any UI on top.
 *
 * Usage:
 *   pnpm research -- --company "Stripe" --url https://stripe.com --types system_design,dsa
 *   pnpm research -- --company "Anthropic" --types behavioral --interviewer "Jane Doe"
 */
import "dotenv/config";
import { runResearchPipeline } from "../lib/research/pipeline";
import { INTERVIEW_CATEGORIES, researchInputSchema } from "../lib/research/types";

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      out[key] = value;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.company) {
    console.error(`Missing --company. Example:
  pnpm research -- --company "Stripe" --url https://stripe.com --types system_design,dsa

Valid --types values: ${INTERVIEW_CATEGORIES.join(", ")}`);
    process.exit(1);
  }

  const types = (args.types ?? "dsa,system_design")
    .split(",")
    .map((t) => t.trim());

  const input = researchInputSchema.parse({
    companyName: args.company,
    companyUrl: args.url,
    interviewerName: args.interviewer,
    interviewerUrl: args["interviewer-url"],
    interviewTypes: types,
    roleContext: args.role,
    fullLoop: args["full-loop"] === "true",
  });

  console.log(`\nResearching ${input.companyName} — categories: ${input.interviewTypes.join(", ")}\n`);

  const { report, budget } = await runResearchPipeline(input, (event) => {
    console.log(`[${event.stage}] ${event.message}`);
  });

  console.log("\n===== REPORT =====\n");
  console.log(JSON.stringify(report, null, 2));

  console.log("\n===== COST BREAKDOWN =====\n");
  console.log(budget.summary());

  const capUsd = 1.0;
  if (budget.totalUsd > capUsd) {
    console.error(`\n⚠️  OVER BUDGET: $${budget.totalUsd.toFixed(4)} exceeds the $${capUsd.toFixed(2)} cap.`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
