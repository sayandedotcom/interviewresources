import DodoPayments from "dodopayments";

import { recordProductEvent } from "@/lib/events";
import { getPack } from "@/lib/packs";
import { dodoPaymentsConfig } from "@/lib/payments";
import { getSessionUser } from "@/lib/session";

/**
 * Creates a Dodo checkout session for a credit pack. The userId travels in the
 * session metadata and is taken from the server session — never from the
 * request body, which the client controls and could point at another account.
 * The webhook reads it back to decide who to credit.
 */
export async function POST(request: Request) {
  if (!dodoPaymentsConfig) {
    return Response.json({ enabled: false }, { status: 503 });
  }

  const user = await getSessionUser(request.headers);
  if (!user) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const pack = getPack(String(body.plan ?? ""));
  if (!pack) {
    return Response.json({ error: "unknown_plan" }, { status: 400 });
  }
  if (!pack.productId) {
    return Response.json(
      { error: "plan_unavailable", detail: `No Dodo product id configured for "${pack.slug}".` },
      { status: 500 }
    );
  }

  const client = new DodoPayments({
    bearerToken: dodoPaymentsConfig.bearerToken,
    environment: dodoPaymentsConfig.environment,
  });

  const session = await client.checkoutSessions.create({
    product_cart: [{ product_id: pack.productId, quantity: 1 }],
    customer: { email: user.email, name: user.name },
    metadata: { userId: user.id, plan: pack.slug },
    return_url: dodoPaymentsConfig.returnUrl,
  });

  if (!session.checkout_url) {
    return Response.json({ error: "checkout_failed" }, { status: 502 });
  }

  await recordProductEvent("checkout_started", user.id, { pack: pack.slug });
  return Response.json({ checkoutUrl: session.checkout_url });
}
