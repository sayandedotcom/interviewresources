import { eq } from "drizzle-orm";

import {
  MIN_RUN_CREDITS,
  chargeCredits,
  creditsToBudgetUsd,
  getBalance,
  usdToCredits,
} from "@/lib/credits";
import { db } from "@/lib/db/index";
import { reports, researches } from "@/lib/db/schema";
import { BudgetTracker, type CostEntry, EFFORT_PRESETS } from "@/lib/research/budget";
import { runResearchPipeline } from "@/lib/research/pipeline";
import { MAX_SESSIONS_PER_USER, hasRunInFlight, pruneToLimit } from "@/lib/research/sessions";
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

  // One run at a time per user. The balance check below reads a balance it does
  // not hold a lock on, so without this a user could fire N requests in parallel
  // and have every one of them pass the same check and start spending.
  if (await hasRunInFlight(user.id)) {
    return Response.json(
      { error: "run_in_flight", detail: "You already have a research run going." },
      { status: 409 }
    );
  }

  // Charge happens after the run, when the real cost is known. Rather than
  // demanding the effort's worst-case credits up front — which a 100-credit
  // Starter pack could never satisfy at high effort — we cap the pipeline's spend
  // at the lesser of the effort ceiling and what this balance can pay for. The
  // run degrades and stops inside that budget, so the charge below can never
  // exceed the balance.
  const balance = await getBalance(user.id);
  if (balance < MIN_RUN_CREDITS) {
    return Response.json(
      { error: "insufficient_credits", balance, required: MIN_RUN_CREDITS },
      { status: 402 }
    );
  }
  const capUsd = Math.min(EFFORT_PRESETS[input.effort].capUsd, creditsToBudgetUsd(balance));

  // Make room before inserting, so the user never sees an eleventh session.
  await pruneToLimit(user.id, MAX_SESSIONS_PER_USER - 1);

  const [research] = await db
    .insert(researches)
    .values({
      userId: user.id,
      companyName: input.companyName,
      interviewers: input.interviewers,
      interviewType: input.fullLoop ? "full_loop" : input.interviewTypes.join(","),
      roleContext: input.roleContext,
      status: "running",
    })
    .returning({ id: researches.id });

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
          .where(eq(researches.id, research.id));

        await db.insert(reports).values({ researchId: research.id, jsonPayload: report });

        const { balanceAfter } = await chargeCredits({
          userId: user.id,
          credits: creditsCharged,
          reason: "research",
          researchId: research.id,
        });

        controller.enqueue(
          sse({
            kind: "report",
            report,
            researchId: research.id,
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
          .where(eq(researches.id, research.id));

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
