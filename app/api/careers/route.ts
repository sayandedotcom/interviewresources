import { and, eq, gt } from "drizzle-orm";

import { jobApplicationSchema } from "@/lib/careers/application";
import { getRole } from "@/lib/careers/roles";
import { db } from "@/lib/db/index";
import { jobApplications } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * How long one email address has to wait before applying to the same role
 * again. Public, unauthenticated, and writing to the database, so it needs
 * some floor — but the floor is per role, because applying to two different
 * openings in one sitting is a reasonable thing to do.
 */
const REAPPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Receives a careers application and files it. Deliberately unauthenticated. */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Send JSON." }, { status: 400 });
  }

  const parsed = jobApplicationSchema.safeParse(payload);
  if (!parsed.success) {
    // Field-keyed so the form can put each message next to its input.
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "form");
      fieldErrors[field] ??= issue.message;
    }
    return Response.json(
      { error: "Please fix the highlighted fields.", fieldErrors },
      { status: 400 }
    );
  }

  const { roleSlug, name, email, message, consent } = parsed.data;

  // The schema already rejected unknown slugs; this is what gives us the title
  // to snapshot alongside the row.
  const role = getRole(roleSlug);
  if (!role) {
    return Response.json({ error: "That role is not open." }, { status: 400 });
  }

  const normalisedEmail = email.trim().toLowerCase();

  try {
    const [recent] = await db
      .select({ id: jobApplications.id })
      .from(jobApplications)
      .where(
        and(
          eq(jobApplications.email, normalisedEmail),
          eq(jobApplications.roleSlug, roleSlug),
          gt(jobApplications.createdAt, new Date(Date.now() - REAPPLY_WINDOW_MS))
        )
      )
      .limit(1);

    // Not an error as far as the applicant is concerned: they already told us,
    // and a second copy of the same message helps nobody. Report success.
    if (recent) {
      return Response.json({ ok: true, duplicate: true });
    }

    await db.insert(jobApplications).values({
      roleSlug,
      roleTitle: role.title,
      name: name.trim(),
      email: normalisedEmail,
      message: message.trim(),
      consent,
    });
  } catch (error) {
    console.error("careers: could not file application", error);
    return Response.json(
      { error: "We could not file that. Please try again in a moment." },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}
