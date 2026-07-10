import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/index";
import { creditsLedger, reports, researches, users } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const userResearches = await db.select().from(researches).where(eq(researches.userId, userId));

  const userCredits = await db.select().from(creditsLedger).where(eq(creditsLedger.userId, userId));

  const researchIds = userResearches.map((r) => r.id);
  const userReports =
    researchIds.length > 0
      ? await db.select().from(reports).where(eq(reports.researchId, researchIds[0]))
      : [];

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      marketingEmailOptIn: user.marketingEmailOptIn,
      createdAt: user.createdAt,
    },
    researches: userResearches.map((r) => ({
      id: r.id,
      companyName: r.companyName,
      interviewType: r.interviewType,
      roleContext: r.roleContext,
      status: r.status,
      createdAt: r.createdAt,
    })),
    credits: userCredits.map((c) => ({
      id: c.id,
      delta: c.delta,
      reason: c.reason,
      createdAt: c.createdAt,
    })),
  };

  return Response.json(exportData, {
    headers: {
      "Content-Disposition": `attachment; filename="scouting-report-data-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
