import { deleteSession } from "@/lib/research/sessions";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";

/** Removes one research session and its report. Scoped to the signed-in owner. */
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const user = await getSessionUser(request.headers);
  if (!user) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  // A session belonging to somebody else is indistinguishable from a missing one.
  if (!(await deleteSession(user.id, id))) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json({ deleted: true });
}
