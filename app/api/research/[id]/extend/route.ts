import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  EXTEND_CAP_USD,
  MIN_EXTEND_CREDITS,
  chargeCredits,
  creditsToBudgetUsd,
  getBalance,
  usdToCredits,
} from "@/lib/credits";
import { db } from "@/lib/db/index";
import { reports, researches } from "@/lib/db/schema";
import { type CostEntry, MAX_EFFORT_LINKS } from "@/lib/research/budget";
import { runResearchPipeline } from "@/lib/research/pipeline";
import type { Report } from "@/lib/research/types";
import { getSessionUser } from "@/lib/session";

// Same constraints as the full run: this calls Gemini + Tavily inline.
export const runtime = "nodejs";
export const maxDuration = 300;

const extendBodySchema = z.object({
  interviewTypes: z.array(z.string().min(1)).min(1).max(5),
});

function sse(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

function costCents(entries: CostEntry[], kind: CostEntry["kind"]): number {
  const usd = entries.filter((e) => e.kind === kind).reduce((sum, e) => sum + e.costUsd, 0);
  return Math.round(usd * 100);
}

/**
 * Folds a fresh pipeline result into the report already on disk. Questions are
 * appended (the pipeline was told not to repeat the existing ones); the prose
 * sections stay as the original run wrote them, since the extension researched
 * only a slice of the loop and its snapshot would be thinner.
 */
function mergeReports(existing: Report, addition: Report): Report {
  const links = [...(existing.importantLinks ?? [])];
  for (const link of addition.importantLinks ?? []) {
    if (!links.some((l) => l.url === link.url)) links.push(link);
  }

  return {
    ...existing,
    questions: [...existing.questions, ...addition.questions],
    importantLinks: links.slice(0, MAX_EFFORT_LINKS),
  };
}

export async function POST(request: Request, ctx: RouteContext<"/api/research/[id]/extend">) {
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
      costCentsLlm: researches.costCentsLlm,
      costCentsSearch: researches.costCentsSearch,
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

  const balance = await getBalance(user.id);
  if (balance < MIN_EXTEND_CREDITS) {
    return Response.json(
      { error: "insufficient_credits", balance, required: MIN_EXTEND_CREDITS },
      { status: 402 }
    );
  }
  const capUsd = Math.min(EXTEND_CAP_USD, creditsToBudgetUsd(balance));

  const existing = row.jsonPayload as Report;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { report: addition, budget } = await runResearchPipeline(
          {
            companyName: row.companyName,
            roleContext: row.roleContext ?? undefined,
            interviewers: [],
            interviewTypes: body.interviewTypes,
            fullLoop: false,
            excludeQuestions: existing.questions.map((q) => q.question),
            // The original run's effort isn't persisted, and an extension is a
            // slice of a report rather than a whole one, so it always runs at
            // the balanced preset within EXTEND_CAP_USD.
            effort: "medium",
          },
          (event) => controller.enqueue(sse({ kind: "progress", ...event })),
          capUsd
        );

        const merged = mergeReports(existing, addition);
        const entries = budget.breakdown();
        const creditsCharged = usdToCredits(budget.totalUsd);

        // The sidebar renders interviewType, so newly scouted rounds belong in it.
        const rounds = new Set(row.interviewType.split(",").filter(Boolean));
        for (const t of body.interviewTypes) rounds.add(t);

        await db.update(reports).set({ jsonPayload: merged }).where(eq(reports.id, row.reportId));

        await db
          .update(researches)
          .set({
            interviewType: [...rounds].join(","),
            costCentsLlm: row.costCentsLlm + costCents(entries, "llm"),
            costCentsSearch: row.costCentsSearch + costCents(entries, "search"),
            creditsCharged: (row.creditsCharged ?? 0) + creditsCharged,
          })
          .where(eq(researches.id, row.researchId));

        const { balanceAfter } = await chargeCredits({
          userId: user.id,
          credits: creditsCharged,
          reason: "research_extend",
          researchId: row.researchId,
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
