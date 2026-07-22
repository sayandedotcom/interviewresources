import {
  MAX_RUN_CREDITS,
  MIN_RUN_CREDITS,
  effortCredits,
  extendCredits,
  getBalance,
  isPaymentCredited,
} from "@/lib/credits";
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
      effortCredits: effortCredits(),
      extendCredits: extendCredits(),
    });
  }

  const balance = await getBalance(user.id);

  // Only present when asked for. The header and research form poll this route
  // too, and an unconditional extra query would cost them a roundtrip they have
  // no use for.
  const paymentId = new URL(request.url).searchParams.get("payment_id");

  return Response.json({
    signedIn: true,
    user: { name: user.name, email: user.email, image: user.image },
    balance,
    maxRunCredits: MAX_RUN_CREDITS,
    minRunCredits: MIN_RUN_CREDITS,
    effortCredits: effortCredits(),
    extendCredits: extendCredits(),
    ...(paymentId ? { credited: await isPaymentCredited(user.id, paymentId) } : {}),
  });
}
