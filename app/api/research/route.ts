import { eq } from "drizzle-orm";

import { MIN_RUN_CREDITS, chargeCredits, creditsToBudgetUsd, usdToCredits } from "@/lib/credits";
import { db } from "@/lib/db/index";
import { reports, researches } from "@/lib/db/schema";
import { recordProductEvent } from "@/lib/events";
import { BudgetTracker, type CostEntry, EFFORT_PRESETS } from "@/lib/research/budget";
import { runResearchPipeline } from "@/lib/research/pipeline";
import { startResearchRun } from "@/lib/research/sessions";
import { researchInputSchema } from "@/lib/research/types";
import { getSessionUser } from "@/lib/session";

// The pipeline calls out to Gemini + Tavily and can run for minutes. It runs
// inline in the route for now (M0/M1) — the Inngest job queue that will take
// this over is a later milestone (PRD §8.1, M2). On serverless this needs a
// long maxDuration; it will still hit platform ceilings for big companies,
// which is exactly why the queue is planned.
export const runtime = "nodejs";
export const maxDuration = 300;

function sse(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

/** BudgetTracker reports dollars; the researches table stores cents per kind. */
function costCents(entries: CostEntry[], kind: CostEntry["kind"]): number {
  const usd = entries.filter((e) => e.kind === kind).reduce((sum, e) => sum + e.costUsd, 0);
  return Math.round(usd * 100);
}

export async function POST(request: Request) {
  const user = await getSessionUser(request.headers);
  if (!user) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  let input;
  try {
    input = researchInputSchema.parse(await request.json());
  } catch (err) {
    return Response.json(
      { error: "Invalid research request.", detail: String(err) },
      { status: 400 }
    );
  }

  const start = await startResearchRun({
    userId: user.id,
    minimumCredits: MIN_RUN_CREDITS,
    companyName: input.companyName,
    interviewers: input.interviewers,
    interviewType: input.fullLoop ? "full_loop" : input.interviewTypes.join(","),
    roleContext: input.roleContext,
  });

  if (start.status === "run_in_flight") {
    return Response.json(
      { error: "run_in_flight", detail: "You already have a research run going." },
      { status: 409 }
    );
  }

  if (start.status === "insufficient_credits") {
    return Response.json(
      { error: "insufficient_credits", balance: start.balance, required: MIN_RUN_CREDITS },
      { status: 402 }
    );
  }
  const capUsd = Math.min(EFFORT_PRESETS[input.effort].capUsd, creditsToBudgetUsd(start.balance));
  const researchId = start.researchId;

  const tracker = new BudgetTracker(capUsd);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { report, budget } = await runResearchPipeline(
          input,
          (event) => controller.enqueue(sse({ kind: "progress", ...event })),
          capUsd,
          tracker
        );

        const entries = budget.breakdown();
        const creditsCharged = usdToCredits(budget.totalUsd);

        await db
          .update(researches)
          .set({
            status: "done",
            costCentsLlm: costCents(entries, "llm"),
            costCentsSearch: costCents(entries, "search"),
            creditsCharged,
          })
          .where(eq(researches.id, researchId));

        await db.insert(reports).values({ researchId, jsonPayload: report });

        const { balanceAfter } = await chargeCredits({
          userId: user.id,
          credits: creditsCharged,
          reason: "research",
          researchId,
        });
        await recordProductEvent("research_completed", user.id, {
          researchId,
          companyName: input.companyName,
          creditsCharged,
        });

        controller.enqueue(
          sse({
            kind: "report",
            report,
            researchId,
            costUsd: Number(budget.totalUsd.toFixed(4)),
            creditsCharged,
            balanceAfter,
          })
        );
      } catch (err) {
        // A failed run costs us the API spend, but the user is not charged.
        // Record whatever the tracker captured before the throw so the cost
        // isn't invisible to admin reporting.
        const entries = tracker.breakdown();
        await db
          .update(researches)
          .set({
            status: "failed",
            costCentsLlm: costCents(entries, "llm"),
            costCentsSearch: costCents(entries, "search"),
          })
          .where(eq(researches.id, researchId));
        await recordProductEvent("research_failed", user.id, {
          researchId,
          companyName: input.companyName,
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
