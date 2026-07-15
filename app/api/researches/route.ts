import { MAX_SESSIONS_PER_USER, getUserResearches } from "@/lib/research/sessions";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Past runs for the sidebar session list — scoped to the signed-in user. `limit`
 * rides along so the sidebar can show the quota without importing the db module.
 * The `(app)` layout seeds the same data server-side; this route is the refetch
 * the sidebar runs on navigation to stay fresh.
 */
export async function GET(request: Request) {
  const user = await getSessionUser(request.headers);
  if (!user) {
    return Response.json({ sessions: [], limit: MAX_SESSIONS_PER_USER });
  }

  const sessions = await getUserResearches(user.id);

  return Response.json({ sessions, limit: MAX_SESSIONS_PER_USER });
}
