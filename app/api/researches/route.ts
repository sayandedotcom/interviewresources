import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/index";
import { researches } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Past runs for the sidebar session list — scoped to the signed-in user. */
export async function GET(request: Request) {
  const user = await getSessionUser(request.headers);
  if (!user) {
    return Response.json({ sessions: [] });
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
    .limit(50);

  return Response.json({ sessions });
}
