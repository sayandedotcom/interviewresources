import { eq } from "drizzle-orm";

import {
  MIN_RUN_CREDITS,
  creditsToBudgetUsd,
  releaseCreditReservation,
  settleCreditReservation,
  usdToCredits,
} from "@/lib/credits";
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
// long maxDuration; 300s is the Hobby plan's ceiling, and big companies will
// still hit it, which is exactly why the queue is planned. Keep this in step
// with RUN_INFLIGHT_WINDOW_MS, which expires rows this route abandons.
export const runtime = "nodejs";
export const maxDuration = 300;

function sse(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

/** BudgetTracker reports dollars; the researches table stores cents per kind. */
function costMicros(entries: CostEntry[], kind: CostEntry["kind"]): number {
  return entries
    .filter((entry) => entry.kind === kind)
    .reduce((sum, entry) => sum + entry.costMicros, 0);
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
    maximumCredits: usdToCredits(EFFORT_PRESETS[input.effort].capUsd),
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
  const capUsd = Math.min(
    EFFORT_PRESETS[input.effort].capUsd,
    creditsToBudgetUsd(start.reservedCredits)
  );
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

        // A done run must always have a report. Keeping these writes in one
        // transaction prevents a transient DB failure from creating a
        // clickable sidebar entry whose report page can only return 404.
        await db.transaction(async (tx) => {
          await tx.insert(reports).values({ researchId, jsonPayload: report });
          await tx
            .update(researches)
            .set({
              status: "done",
              costMicrosLlm: costMicros(entries, "llm"),
              costMicrosSearch: costMicros(entries, "search"),
              creditsCharged,
            })
            .where(eq(researches.id, researchId));
        });

        const { balanceAfter } = await settleCreditReservation({
          userId: user.id,
          reference: start.reservationRef,
          actualCredits: creditsCharged,
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
            costMicrosLlm: costMicros(entries, "llm"),
            costMicrosSearch: costMicros(entries, "search"),
          })
          .where(eq(researches.id, researchId));
        await recordProductEvent("research_failed", user.id, {
          researchId,
          companyName: input.companyName,
        });
        await releaseCreditReservation({
          userId: user.id,
          reference: start.reservationRef,
          reason: "research_failed:release",
          researchId,
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
