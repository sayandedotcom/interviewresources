import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/index";
import { users } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db
    .select({
      marketingEmailOptIn: users.marketingEmailOptIn,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return Response.json({ marketingEmailOptIn: user?.marketingEmailOptIn ?? false });
}

export async function PATCH(request: Request) {
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { marketingEmailOptIn } = body;

  if (typeof marketingEmailOptIn !== "boolean") {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  await db
    .update(users)
    .set({ marketingEmailOptIn, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  return Response.json({ success: true });
}
