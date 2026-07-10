import { eq } from "drizzle-orm";

import { auth } from "./auth";
import { db } from "./db/index";
import { users } from "./db/schema";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

/** Resolves the signed-in user for a route handler, or null. */
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
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return row ?? null;
}
