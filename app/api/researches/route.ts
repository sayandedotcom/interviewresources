import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/index";
import { researches } from "@/lib/db/schema";
import { MAX_SESSIONS_PER_USER } from "@/lib/research/sessions";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Past runs for the sidebar session list — scoped to the signed-in user. `limit`
 * rides along so the sidebar can show the quota without importing the db module.
 */
export async function GET(request: Request) {
  const user = await getSessionUser(request.headers);
  if (!user) {
    return Response.json({ sessions: [], limit: MAX_SESSIONS_PER_USER });
  }

  const sessions = await db
    .select({
      id: researches.id,
      companyName: researches.companyName,
      interviewType: researches.interviewType,
      status: researches.status,
      createdAt: researches.createdAt,
    })
    .from(researches)
    .where(eq(researches.userId, user.id))
    .orderBy(desc(researches.createdAt))
    .limit(MAX_SESSIONS_PER_USER);

  return Response.json({ sessions, limit: MAX_SESSIONS_PER_USER });
}
