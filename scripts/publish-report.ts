/**
 * Promote one of your own research reports to a public, indexable page at
 * `/interview-questions/<slug>`.
 *
 * Usage:
 *   pnpm publish-report -- --list
 *   pnpm publish-report -- --research <uuid>
 *   pnpm publish-report -- --research <uuid> --slug custom-slug
 *   pnpm publish-report -- --research <uuid> --force
 *   pnpm publish-report -- --unpublish <slug>
 *
 * Publishing is deliberately a manual, one-report-at-a-time act rather than a
 * bulk job. These pages are a programmatic content pattern, and the failure
 * mode — hundreds of near-identical pages — is the thing Google's spam policies
 * target. `--force` exists for judgement calls, not for scripting around the
 * quality gate.
 *
 * Only ever run this against reports from an account you control. Publishing a
 * customer's report would expose research they paid for.
 */
import "dotenv/config";
import { desc, eq } from "drizzle-orm";

import { db } from "../lib/db/index";
import { reports, researches } from "../lib/db/schema";
import { companySlug } from "../lib/publishing/company-pages";
import { publishability } from "../lib/publishing/public-report";
import { storedReportSchema } from "../lib/research/types";

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

async function list() {
  const rows = await db
    .select({
      researchId: researches.id,
      companyName: researches.companyName,
      status: researches.status,
      createdAt: researches.createdAt,
      publishedSlug: reports.publishedSlug,
    })
    .from(researches)
    .innerJoin(reports, eq(reports.researchId, researches.id))
    .orderBy(desc(researches.createdAt))
    .limit(40);

  if (rows.length === 0) {
    console.log("No reports found.");
    return;
  }

  console.log(`${rows.length} report(s), newest first:\n`);
  for (const r of rows) {
    const state = r.publishedSlug ? `published → /interview-questions/${r.publishedSlug}` : "—";
    console.log(
      `  ${r.researchId}  ${r.createdAt.toISOString().slice(0, 10)}  ${r.companyName.padEnd(24)} ${state}`
    );
  }
}

async function publish(researchId: string, slugOverride?: string, force = false) {
  const [row] = await db
    .select({
      reportId: reports.id,
      payload: reports.jsonPayload,
      companyName: researches.companyName,
      publishedSlug: reports.publishedSlug,
    })
    .from(reports)
    .innerJoin(researches, eq(reports.researchId, researches.id))
    .where(eq(reports.researchId, researchId))
    .limit(1);

  if (!row) {
    console.error(`No report found for research ${researchId}.`);
    process.exitCode = 1;
    return;
  }

  const parsed = storedReportSchema.safeParse(row.payload);
  if (!parsed.success) {
    console.error("Report payload does not match the current schema; refusing to publish.");
    console.error(parsed.error.issues.slice(0, 5));
    process.exitCode = 1;
    return;
  }

  const gate = publishability(parsed.data);
  if (!gate.ok) {
    console.error(`Quality gate failed for ${row.companyName}:`);
    for (const reason of gate.reasons) console.error(`  - ${reason}`);
    if (!force) {
      console.error(
        "\nRefusing to publish. A thin page hurts more than no page.\n" +
          "Re-run the research with more rounds, or pass --force if you have judged it worth publishing anyway."
      );
      process.exitCode = 1;
      return;
    }
    console.warn("\n--force given; publishing despite the above.\n");
  }

  const slug = slugOverride ?? companySlug(row.companyName);
  if (!slug) {
    console.error(`Could not derive a slug from "${row.companyName}"; pass --slug explicitly.`);
    process.exitCode = 1;
    return;
  }

  await db
    .update(reports)
    .set({ publishedSlug: slug, publishedAt: new Date() })
    .where(eq(reports.id, row.reportId));

  console.log(`Published ${row.companyName} → /interview-questions/${slug}`);
  console.log("The page and sitemap revalidate within the hour, or on the next deploy.");
}

async function unpublish(slug: string) {
  const updated = await db
    .update(reports)
    .set({ publishedSlug: null, publishedAt: null })
    .where(eq(reports.publishedSlug, slug))
    .returning({ id: reports.id });

  if (updated.length === 0) {
    console.error(`No published page with slug "${slug}".`);
    process.exitCode = 1;
    return;
  }
  console.log(`Unpublished /interview-questions/${slug}.`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.list) return list();
  if (args.unpublish) return unpublish(args.unpublish);
  if (args.research) {
    return publish(args.research, args.slug === "true" ? undefined : args.slug, !!args.force);
  }

  console.log(
    [
      "Usage:",
      "  pnpm publish-report -- --list",
      "  pnpm publish-report -- --research <uuid> [--slug custom-slug] [--force]",
      "  pnpm publish-report -- --unpublish <slug>",
    ].join("\n")
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
