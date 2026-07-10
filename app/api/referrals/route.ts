import { env } from "@/env";
import { REFERRAL_PARAM } from "@/proxy";

import {
  REFEREE_BONUS_CREDITS,
  REFERRAL_REWARD_CAP,
  REFERRER_REWARD_CREDITS,
  getOrCreateReferralCode,
  getReferralStats,
} from "@/lib/referrals";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The signed-in user's referral link and standing. Generates a code on first hit. */
export async function GET(request: Request) {
  const user = await getSessionUser(request.headers);
  if (!user) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const code = await getOrCreateReferralCode(user.id);
  const stats = await getReferralStats(user.id);

  const origin = env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const link = `${origin}/?${REFERRAL_PARAM}=${code}`;

  return Response.json({
    code,
    link,
    cap: REFERRAL_REWARD_CAP,
    referrerReward: REFERRER_REWARD_CREDITS,
    refereeBonus: REFEREE_BONUS_CREDITS,
    ...stats,
  });
}
