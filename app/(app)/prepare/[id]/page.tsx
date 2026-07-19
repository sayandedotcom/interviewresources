import { notFound, redirect } from "next/navigation";

import { and, eq } from "drizzle-orm";

import { extendCredits, getBalance } from "@/lib/credits";
import { db } from "@/lib/db/index";
import { reports, researches } from "@/lib/db/schema";
import type { Report } from "@/lib/research/types";
import { getCurrentUser } from "@/lib/session";

import { ReportView } from "@/features/research/report-view";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect("/");

  // The balance is read here rather than from /api/me so the extend estimate's
  // ring lands with the first paint. It doesn't depend on the report, so the two
  // go together instead of one after the other.
  const [[row], balance] = await Promise.all([
    db
      .select({
        companyName: researches.companyName,
        costCentsLlm: researches.costCentsLlm,
        costCentsSearch: researches.costCentsSearch,
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

  const costUsd = (row.costCentsLlm + row.costCentsSearch) / 100;

  return (
    <div className="mx-auto w-full max-w-3xl px-1 pb-24">
      <ReportView
        report={row.jsonPayload as Report}
        costUsd={costUsd}
        creditsCharged={row.creditsCharged}
        company={row.companyName}
        researchId={id}
        extendCredits={extendCredits()}
        balance={balance}
      />
    </div>
  );
}
