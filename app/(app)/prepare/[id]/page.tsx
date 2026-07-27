import { notFound, redirect } from "next/navigation";

import { and, eq } from "drizzle-orm";

import { extendCredits, getBalance } from "@/lib/credits";
import { db } from "@/lib/db/index";
import { reports, researches } from "@/lib/db/schema";
import {
  SAMPLE_COMPANY,
  SAMPLE_COST_USD,
  SAMPLE_CREDITS,
  SAMPLE_LOCATION,
  SAMPLE_REPORT,
  SAMPLE_RESEARCH_ID,
  SAMPLE_ROLE,
} from "@/lib/research/sample-report";
import type { Report } from "@/lib/research/types";
import { getCurrentUser } from "@/lib/session";

import { ReportView } from "@/features/research/report-view";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect("/");

  // Before the lookup: the sample is a bundled capture, not a row, so the
  // owner-scoped query below would 404 it for everyone.
  if (id === SAMPLE_RESEARCH_ID) return <SampleReport />;

  // The balance is read here rather than from /api/me so the extend estimate's
  // ring lands with the first paint. It doesn't depend on the report, so the two
  // go together instead of one after the other.
  const [[row], balance] = await Promise.all([
    db
      .select({
        companyName: researches.companyName,
        roleContext: researches.roleContext,
        costMicrosLlm: researches.costMicrosLlm,
        costMicrosSearch: researches.costMicrosSearch,
        creditsCharged: researches.creditsCharged,
        jsonPayload: reports.jsonPayload,
      })
      .from(researches)
      .innerJoin(reports, eq(reports.researchId, researches.id))
      .where(and(eq(researches.id, id), eq(researches.userId, user.id)))
      .limit(1),
    getBalance(user.id),
  ]);

  if (!row) notFound();

  const costUsd = (row.costMicrosLlm + row.costMicrosSearch) / 1_000_000;

  return (
    <div className="mx-auto w-full max-w-6xl px-1 pb-24">
      <ReportView
        report={row.jsonPayload as Report}
        costUsd={costUsd}
        creditsCharged={row.creditsCharged}
        company={row.companyName}
        roleContext={row.roleContext ?? undefined}
        researchId={id}
        extendCredits={extendCredits()}
        balance={balance}
      />
    </div>
  );
}

/**
 * The sample, rendered read-only in the same shell as a real report.
 *
 * Read-only is achieved by prop omission, the same way `app/share/[token]`
 * does it — there is no `readOnly` flag on ReportView. Withholding
 * `researchId` is what removes the per-round "More" buttons, the extend
 * confirmation and the whole "Keep on Generating" section: everything that
 * would spend credits against a research that does not exist.
 *
 * The cost and credits *are* passed. They were this run's real numbers, and on
 * a sample they answer the question a new user actually has — what does one of
 * these cost? — which an omitted badge would leave hanging.
 */
function SampleReport() {
  return (
    <div className="mx-auto w-full max-w-6xl px-1 pb-24">
      <div className="border-primary/40 bg-primary/5 mt-4 rounded-md border-l-2 px-4 py-3">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
          Sample report
        </p>
        <p className="font-display text-foreground mt-1.5 text-[13.5px] leading-relaxed">
          For a {SAMPLE_ROLE} role at {SAMPLE_COMPANY}, {SAMPLE_LOCATION} — a real report from an
          earlier run, kept here so you can see what you get before spending any credits. It is
          read-only — you can export it or copy it as a prompt, but it cannot be extended. Delete it
          from the sidebar whenever you are done with it.
        </p>
      </div>
      <ReportView
        report={SAMPLE_REPORT}
        costUsd={SAMPLE_COST_USD}
        creditsCharged={SAMPLE_CREDITS}
        company={SAMPLE_COMPANY}
        roleContext={SAMPLE_ROLE}
      />
    </div>
  );
}
