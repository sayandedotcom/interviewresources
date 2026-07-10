import { env } from "@/env";

import { reapStuckRuns } from "@/lib/admin/queries";

// Touches the database, so it cannot run on edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sweeps runs stranded in "running" by a dead route handler. Invoked by Vercel
 * Cron (see vercel.json), which sends `Authorization: Bearer $CRON_SECRET`.
 *
 * The path is publicly reachable, so this fails closed: no CRON_SECRET
 * configured means nobody can invoke it, same as lib/admin/auth.ts.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = env.CRON_SECRET;

  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const reaped = await reapStuckRuns();

  if (reaped.length > 0) {
    console.warn(`[cron/reap] failed ${reaped.length} stuck run(s): ${reaped.join(", ")}`);
  }

  return Response.json({ reaped: reaped.length });
}
