import { runResearchPipeline } from "@/lib/research/pipeline";
import { researchInputSchema } from "@/lib/research/types";

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

export async function POST(request: Request) {
  let input;
  try {
    input = researchInputSchema.parse(await request.json());
  } catch (err) {
    return Response.json(
      { error: "Invalid research request.", detail: String(err) },
      { status: 400 },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { report, budget } = await runResearchPipeline(input, (event) => {
          controller.enqueue(sse({ kind: "progress", ...event }));
        });
        controller.enqueue(
          sse({
            kind: "report",
            report,
            costUsd: Number(budget.totalUsd.toFixed(4)),
          }),
        );
      } catch (err) {
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
