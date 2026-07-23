import { and, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";

import { db } from "@/lib/db/index";
import { reports, researches } from "@/lib/db/schema";
import { recordProductEvent } from "@/lib/events";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";

/**
 * Mints (or returns) the public token for a report, so the owner can hand out a
 * link at `/share/<token>`. The token is minted once and reused: re-sharing a
 * report must not break a link the user has already sent.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const user = await getSessionUser(request.headers);
  if (!user) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  // Scoped by userId, so another user's report reads as missing rather than
  // handing out a share token for it.
  const [row] = await db
    .select({ reportId: reports.id, shareToken: reports.shareToken })
    .from(reports)
    .innerJoin(researches, eq(reports.researchId, researches.id))
    .where(and(eq(researches.id, id), eq(researches.userId, user.id)))
    .limit(1);

  if (!row) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  let token = row.shareToken;
  if (!token) {
    // 144 bits of entropy: the token is the only thing guarding the report.
    token = randomBytes(18).toString("base64url");
    await db.update(reports).set({ shareToken: token }).where(eq(reports.id, row.reportId));
  }

  await recordProductEvent("report_shared", user.id, { researchId: id });
  return Response.json({ token });
}
