import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import {
  MIN_EXTEND_CREDITS,
  creditsToBudgetUsd,
  extendCapUsd,
  releaseCreditReservation,
  reserveCredits,
  settleCreditReservation,
  usdToCredits,
} from "@/lib/credits";
import { db } from "@/lib/db/index";
import { reports, researches } from "@/lib/db/schema";
import { recordProductEvent } from "@/lib/events";
import {
  type CostEntry,
  EFFORT_LEVELS,
  MAX_EFFORT_LINKS,
  MAX_EFFORT_RESOURCES,
} from "@/lib/research/budget";
import { missingSections } from "@/lib/research/display";
import { appendDistinctQuestions, coverageByCategory } from "@/lib/research/evidence";
import { runResearchPipeline } from "@/lib/research/pipeline";
import { canonicalizePublicUrl, mergeResearchResources } from "@/lib/research/resources";
import {
  type ImportantLink,
  REPORT_SECTIONS,
  type Report,
  type ReportSection,
} from "@/lib/research/types";
import { getSessionUser } from "@/lib/session";

// Same constraints as the full run: this calls Gemini + Tavily inline, and 300s
// is the Hobby plan's ceiling for a Serverless Function.
export const runtime = "nodejs";
export const maxDuration = 300;

// A round adds questions; a section fills prose the original run declined. An
// extension may do either or both, so neither list is required on its own — but
// an extension that gathers nothing is a paid no-op, so at least one must be set.
const extendBodySchema = z
  .object({
    interviewTypes: z.array(z.string().min(1)).max(5).default([]),
    sections: z.array(z.enum(REPORT_SECTIONS)).default([]),
    effort: z.enum(EFFORT_LEVELS).default("medium"),
  })
  .refine((body) => body.interviewTypes.length > 0 || body.sections.length > 0, {
    message: "Pick at least one round or section to gather.",
  });

function sse(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

function costMicros(entries: CostEntry[], kind: CostEntry["kind"]): number {
  return entries
    .filter((entry) => entry.kind === kind)
    .reduce((sum, entry) => sum + entry.costMicros, 0);
}

/**
 * Folds a fresh pipeline result into the report already on disk. New questions
 * are appended when rounds were gathered (the pipeline was told not to repeat the
 * existing ones); a prose section the original run declined is filled in when
 * the caller gathered it, while a section the original already wrote is kept as
 * is — the extension only researched a slice, so its version would be thinner.
 */
function mergeReports(
  existing: Report,
  addition: Report,
  opts: { addedRounds: boolean; sections: ReportSection[] }
): Report {
  // `null` means the original run excluded the section: it stays excluded unless
  // this extension explicitly gathered it in (`force`). `undefined` means the
  // report predates the section, which extending it can legitimately fill in.
  const mergeLinks = (
    a: ImportantLink[] | null | undefined,
    b: ImportantLink[] | null,
    force: boolean
  ) => {
    if (a === null && !force) return null;
    const links: ImportantLink[] = [];
    const seen = new Set<string>();
    for (const link of [...(a ?? []), ...(b ?? [])]) {
      const url = canonicalizePublicUrl(link.url);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      links.push({ ...link, url });
    }
    return links.slice(0, MAX_EFFORT_LINKS);
  };

  const questions = opts.addedRounds
    ? appendDistinctQuestions(existing.questions, addition.questions)
    : existing.questions;
  const evidenceCoverageByCategory = coverageByCategory(questions);

  return {
    ...existing,
    // A hole the original left null is filled by the freshly gathered section;
    // prose the original already wrote wins over the extension's thinner take.
    companySnapshot: existing.companySnapshot ?? addition.companySnapshot,
    companyExplainer: existing.companyExplainer ?? addition.companyExplainer,
    likelyLoopStructure: existing.likelyLoopStructure ?? addition.likelyLoopStructure,
    skillsRequired: existing.skillsRequired ?? addition.skillsRequired,
    recruiterPitch: existing.recruiterPitch ?? addition.recruiterPitch,
    questions,
    interviewExperiences: mergeLinks(
      existing.interviewExperiences,
      addition.interviewExperiences,
      opts.sections.includes("experiences")
    ),
    importantLinks: mergeLinks(existing.importantLinks, addition.importantLinks, true) ?? [],
    researchResources: mergeResearchResources(
      existing.researchResources,
      addition.researchResources,
      MAX_EFFORT_RESOURCES
    ),
    evidenceCoverageByCategory,
    evidenceCoverage: Object.values(evidenceCoverageByCategory).every(
      (coverage) => coverage === "rich"
    )
      ? "rich"
      : "sparse",
  };
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const user = await getSessionUser(request.headers);
  if (!user) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body;
  try {
    body = extendBodySchema.parse(await request.json());
  } catch (err) {
    return Response.json(
      { error: "Invalid extend request.", detail: String(err) },
      { status: 400 }
    );
  }

  // Scoped by userId, so another user's report is indistinguishable from a
  // missing one.
  const [row] = await db
    .select({
      researchId: researches.id,
      companyName: researches.companyName,
      roleContext: researches.roleContext,
      interviewType: researches.interviewType,
      status: researches.status,
      costMicrosLlm: researches.costMicrosLlm,
      costMicrosSearch: researches.costMicrosSearch,
      creditsCharged: researches.creditsCharged,
      reportId: reports.id,
      jsonPayload: reports.jsonPayload,
    })
    .from(researches)
    .innerJoin(reports, eq(reports.researchId, researches.id))
    .where(and(eq(researches.id, id), eq(researches.userId, user.id)))
    .limit(1);

  if (!row) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  if (row.status !== "done") {
    return Response.json(
      { error: "not_extendable", detail: "Only a finished report can be extended." },
      { status: 409 }
    );
  }

  const reservationRef = `extend:${randomUUID()}`;
  const reservationResult = await reserveCredits({
    userId: user.id,
    minimumCredits: MIN_EXTEND_CREDITS,
    maximumCredits: usdToCredits(extendCapUsd(body.effort)),
    reference: reservationRef,
    reason: "research_extend",
    researchId: row.researchId,
  });
  if (reservationResult.status === "insufficient_credits") {
    return Response.json(
      {
        error: "insufficient_credits",
        balance: reservationResult.balance,
        required: MIN_EXTEND_CREDITS,
      },
      { status: 402 }
    );
  }
  const capUsd = Math.min(
    extendCapUsd(body.effort),
    creditsToBudgetUsd(reservationResult.reservation.reservedCredits)
  );

  const existing = row.jsonPayload as Report;

  // Only sections the report is actually missing are worth paying to research —
  // re-gathering a section the original already wrote would be discarded by the
  // merge. The UI offers only these, but the server does not trust that.
  const missing = missingSections(existing);
  const addSections = body.sections.filter((section) => missing.includes(section));

  // Interview experiences merge additively, so an extension of a report that
  // already has them refreshes the list — unchanged behavior. On top of that,
  // fold in any missing section the caller explicitly chose to gather in.
  const pipelineSections = new Set<ReportSection>(addSections);
  if (existing.interviewExperiences !== null) pipelineSections.add("experiences");
  const sections = [...pipelineSections];

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const context = existing.researchContext;
        const { report: addition, budget } = await runResearchPipeline(
          {
            companyName: row.companyName,
            companyUrl: context?.companyUrl,
            jobDescription: context?.jobDescription,
            yearsExperience: context?.yearsExperience,
            techStack: context?.techStack,
            location: context?.location,
            teamContext: context?.teamContext,
            recruiterNotes: context?.recruiterNotes,
            roleContext: row.roleContext ?? undefined,
            interviewers: context?.interviewers ?? [],
            interviewTypes: body.interviewTypes,
            fullLoop: false,
            sections,
            excludeQuestions: existing.questions.map((q) => q.question),
            excludeSourceUrls: (existing.researchResources ?? []).map((resource) => resource.url),
            generateQuestions: body.interviewTypes.length > 0,
            // The caller picks how hard this extension searches, independent of
            // the original run's effort (which isn't persisted). The budget is
            // still capped at half this effort's full-run cap; see extendCapUsd.
            effort: body.effort,
          },
          (event) => controller.enqueue(sse({ kind: "progress", ...event })),
          capUsd
        );

        const merged = mergeReports(existing, addition, {
          addedRounds: body.interviewTypes.length > 0,
          sections,
        });
        const entries = budget.breakdown();
        const creditsCharged = usdToCredits(budget.totalUsd);

        // The sidebar renders interviewType, so newly gathered rounds belong in it.
        const rounds = new Set(row.interviewType.split(",").filter(Boolean));
        for (const t of body.interviewTypes) rounds.add(t);

        await db.update(reports).set({ jsonPayload: merged }).where(eq(reports.id, row.reportId));

        await db
          .update(researches)
          .set({
            interviewType: [...rounds].join(","),
            costMicrosLlm: row.costMicrosLlm + costMicros(entries, "llm"),
            costMicrosSearch: row.costMicrosSearch + costMicros(entries, "search"),
            creditsCharged: (row.creditsCharged ?? 0) + creditsCharged,
          })
          .where(eq(researches.id, row.researchId));

        const { balanceAfter } = await settleCreditReservation({
          userId: user.id,
          reference: reservationRef,
          actualCredits: creditsCharged,
          reason: "research_extend",
          researchId: row.researchId,
        });
        await recordProductEvent("report_extended", user.id, {
          researchId: row.researchId,
          creditsCharged,
          rounds: body.interviewTypes,
          sections,
        });

        controller.enqueue(
          sse({
            kind: "report",
            report: merged,
            researchId: row.researchId,
            costUsd: Number(budget.totalUsd.toFixed(4)),
            creditsCharged,
            balanceAfter,
          })
        );
      } catch (err) {
        // The stored report is untouched on failure, and nothing is charged.
        await releaseCreditReservation({
          userId: user.id,
          reference: reservationRef,
          reason: "research_extend_failed:release",
          researchId: row.researchId,
        });
        controller.enqueue(
          sse({ kind: "error", message: err instanceof Error ? err.message : String(err) })
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
