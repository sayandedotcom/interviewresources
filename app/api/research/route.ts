import { eq } from "drizzle-orm";
import { db } from "@/lib/db/index";
import { reports, researches } from "@/lib/db/schema";
import {
  MIN_RUN_CREDITS,
  chargeCredits,
  creditsToBudgetUsd,
  getBalance,
  usdToCredits,
} from "@/lib/credits";
import { BUDGET_CAP_USD, type CostEntry } from "@/lib/research/budget";
import { runResearchPipeline } from "@/lib/research/pipeline";
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
      { status: 400 },
    );
  }

  // The UI hides these fields for free users, so a populated array here means a
  // stale client or a tampered request. Reject rather than silently strip.
  if (input.interviewers.length > 0 && user.tier !== "pro") {
    return Response.json(
      { error: "pro_required", detail: "Interviewer research is a Pro feature." },
      { status: 403 },
    );
  }

  // Charge happens after the run, when the real cost is known. Rather than
  // demanding the worst-case 130 credits up front — which a 100-credit Basic
  // pack could never satisfy — we cap the pipeline's spend at what this balance
  // can pay for. The run degrades and stops inside that budget, so the charge
  // below can never exceed the balance.
  const balance = await getBalance(user.id);
  if (balance < MIN_RUN_CREDITS) {
    return Response.json(
      { error: "insufficient_credits", balance, required: MIN_RUN_CREDITS },
      { status: 402 },
    );
  }
  const capUsd = Math.min(BUDGET_CAP_USD, creditsToBudgetUsd(balance));

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

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { report, budget } = await runResearchPipeline(
          input,
          (event) => controller.enqueue(sse({ kind: "progress", ...event })),
          capUsd,
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
          }),
        );
      } catch (err) {
        // A failed run costs us the API spend, but the user is not charged.
        await db
          .update(researches)
          .set({ status: "failed" })
          .where(eq(researches.id, research.id));

        controller.enqueue(
          sse({ kind: "error", message: err instanceof Error ? err.message : String(err) }),
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
