import { eq, inArray } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/index";
import {
  creditsLedger,
  paymentRefunds,
  payments,
  productEvents,
  questionFeedback,
  reports,
  researches,
  users,
} from "@/lib/db/schema";
import { recordProductEvent } from "@/lib/events";

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
      ? await db.select().from(reports).where(inArray(reports.researchId, researchIds))
      : [];
  const reportIds = userReports.map((report) => report.id);
  const feedback =
    reportIds.length > 0
      ? await db
          .select()
          .from(questionFeedback)
          .where(inArray(questionFeedback.reportId, reportIds))
      : [];
  const userPayments = await db.select().from(payments).where(eq(payments.userId, userId));
  const paymentIds = userPayments.map((payment) => payment.id);
  const refunds =
    paymentIds.length > 0
      ? await db.select().from(paymentRefunds).where(inArray(paymentRefunds.paymentId, paymentIds))
      : [];
  const events = await db.select().from(productEvents).where(eq(productEvents.userId, userId));

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
    reports: userReports.map((report) => ({
      id: report.id,
      researchId: report.researchId,
      payload: report.jsonPayload,
      shareToken: report.shareToken,
      createdAt: report.createdAt,
    })),
    questionFeedback: feedback,
    credits: userCredits.map((c) => ({
      id: c.id,
      delta: c.delta,
      reason: c.reason,
      createdAt: c.createdAt,
    })),
    payments: userPayments,
    refunds,
    productEvents: events,
  };

  const response = Response.json(exportData, {
    headers: {
      "Content-Disposition": `attachment; filename="gathered-resources-data-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
  await recordProductEvent("report_exported", userId, { scope: "account" });
  return response;
}
