import { type NextRequest, NextResponse } from "next/server";

import { Webhooks } from "@dodopayments/nextjs";
import { eq } from "drizzle-orm";

import { grantCredits } from "@/lib/credits";
import { db } from "@/lib/db/index";
import { users } from "@/lib/db/schema";
import { getPackByProductId } from "@/lib/packs";
import { dodoPaymentsConfig } from "@/lib/payments";
import { processReferralReward } from "@/lib/referrals";

/**
 * Resolves who paid. `metadata.userId` is authoritative — we set it server-side
 * at checkout. The email fallback exists only for payments created outside our
 * checkout flow, and can mis-credit if the Dodo email differs from the Google one.
 */
async function resolveUserId(
  metadata: Record<string, unknown>,
  email: string | undefined
): Promise<string | null> {
  const fromMetadata = metadata.userId;
  if (typeof fromMetadata === "string" && fromMetadata) return fromMetadata;

  if (email) {
    const [row] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (row) return row.id;
  }

  return null;
}

/**
 * Built per request, not at module scope: Webhooks() base64-decodes the signing
 * key on construction, so a missing or malformed key would otherwise blow up at
 * build time when Next collects page data.
 */
function buildHandler(webhookKey: string) {
  return Webhooks({
    webhookKey,
    onPaymentSucceeded: async (payload) => {
      const data = payload.data;
      if (data.status !== "succeeded") return;

      const userId = await resolveUserId(data.metadata ?? {}, data.customer?.email);
      if (!userId) {
        // Returning normally (rather than throwing) stops Dodo retrying a
        // payment we will never be able to attribute.
        console.error("dodo webhook: cannot attribute payment", data.payment_id);
        return;
      }

      const packs = (data.product_cart ?? [])
        .map((item) => ({ pack: getPackByProductId(item.product_id), quantity: item.quantity }))
        .filter((entry) => entry.pack !== null)
        .map((entry) => ({ pack: entry.pack!, quantity: entry.quantity }));

      if (packs.length === 0) {
        console.error("dodo webhook: no known packs in cart", data.payment_id);
        return;
      }

      const credits = packs.reduce((sum, e) => sum + e.pack.credits * (e.quantity || 1), 0);
      const reasons = packs.map((e) => e.pack.slug).join("+");

      // The unique constraint on payment_ref makes a redelivered webhook a no-op.
      const applied = await grantCredits({
        userId,
        credits,
        reason: `purchase:${reasons}`,
        paymentRef: data.payment_id,
      });

      // Only pay out a referral on the first delivery of a purchase, and never
      // let a referral failure fail the webhook — the purchase already landed.
      if (applied) {
        try {
          await processReferralReward(userId);
        } catch (error) {
          console.error("referral reward failed for payment", data.payment_id, error);
        }
      }
    },
  });
}

export async function POST(request: NextRequest) {
  if (!dodoPaymentsConfig) {
    return NextResponse.json({ enabled: false }, { status: 503 });
  }
  return buildHandler(dodoPaymentsConfig.webhookKey)(request);
}
