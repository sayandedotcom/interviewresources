import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/index";
import { reports, researches } from "@/lib/db/schema";
import type { Report } from "@/lib/research/types";

import { ReportView } from "@/features/research/report-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The token is the only credential, so a shared report must stay out of search
// results even if the link is posted somewhere public.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * A report rendered for whoever holds the link. No session is required, and no
 * `researchId` is passed down — that prop is what enables the extend controls,
 * which spend the owner's credits.
 */
export default async function Page(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;

  const [row] = await db
    .select({
      companyName: researches.companyName,
      jsonPayload: reports.jsonPayload,
    })
    .from(reports)
    .innerJoin(researches, eq(reports.researchId, researches.id))
    .where(eq(reports.shareToken, token))
    .limit(1);

  if (!row) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24">
      <ReportView
        report={row.jsonPayload as Report}
        costUsd={null}
        creditsCharged={null}
        company={row.companyName}
      />
    </div>
  );
}
