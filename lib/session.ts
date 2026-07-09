import { eq } from "drizzle-orm";

import { auth } from "./auth";
import { db } from "./db/index";
import { users } from "./db/schema";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
  tier: "free" | "pro";
}

/**
 * Resolves the signed-in user for a route handler, or null. `tier` is read
 * straight from the users table rather than the session payload — better-auth
 * only serialises the fields it manages, and tier is ours.
 */
export async function getSessionUser(headers: Headers): Promise<SessionUser | null> {
  if (!auth) return null;

  const session = await auth.api.getSession({ headers });
  if (!session?.user) return null;

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      tier: users.tier,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return row ?? null;
}
