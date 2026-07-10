import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { env } from "@/env";
import { EXPIRED_PARAM, REFERRAL_PARAM } from "@/proxy";

import {
  REFEREE_BONUS_CREDITS,
  REFERRAL_REWARD_CAP,
  REFERRER_REWARD_CREDITS,
  getOrCreateReferralCode,
  getReferralStats,
} from "@/lib/referrals";
import { getSessionUser } from "@/lib/session";

import { ReferralPanel } from "@/features/referrals/referral-panel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const user = await getSessionUser(await headers());
  if (!user) redirect(`/?${EXPIRED_PARAM}=expired`);

  const [code, stats] = await Promise.all([
    getOrCreateReferralCode(user.id),
    getReferralStats(user.id),
  ]);

  const origin = env.NEXT_PUBLIC_SITE_URL ?? "";
  const link = `${origin}/?${REFERRAL_PARAM}=${code}`;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-16">
      <div className="mb-10">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Refer a friend</h1>
        <p className="font-display text-muted-foreground mt-4 text-sm">
          Invite people to Scouting Report and earn credits when they become customers.
        </p>
      </div>

      <ReferralPanel
        link={link}
        referrerReward={REFERRER_REWARD_CREDITS}
        refereeBonus={REFEREE_BONUS_CREDITS}
        convertedCount={stats.convertedCount}
        creditsEarned={stats.creditsEarned}
        cap={REFERRAL_REWARD_CAP}
      />
    </div>
  );
}
