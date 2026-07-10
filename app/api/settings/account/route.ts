import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/index";
import { users } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  try {
    await db.delete(users).where(eq(users.id, userId));
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
