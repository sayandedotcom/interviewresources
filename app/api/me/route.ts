import { MAX_RUN_CREDITS, MIN_RUN_CREDITS, getBalance } from "@/lib/credits";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Session + balance in one call — read by the header, research form, and success page. */
export async function GET(request: Request) {
  const user = await getSessionUser(request.headers);

  if (!user) {
    return Response.json({
      signedIn: false,
      user: null,
      balance: 0,
      maxRunCredits: MAX_RUN_CREDITS,
      minRunCredits: MIN_RUN_CREDITS,
    });
  }

  const balance = await getBalance(user.id);

  return Response.json({
    signedIn: true,
    user: { name: user.name, email: user.email, image: user.image, tier: user.tier },
    balance,
    maxRunCredits: MAX_RUN_CREDITS,
    minRunCredits: MIN_RUN_CREDITS,
  });
}
