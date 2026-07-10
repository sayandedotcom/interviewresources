"use client";

import { useState } from "react";

import { CheckIcon, CopyIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * The interactive half of the referrals page: shows the link with a copy button
 * and a progress bar toward the reward cap. Data is computed on the server and
 * passed in, so this component only owns the "copied" flash.
 */
export function ReferralPanel({
  link,
  referrerReward,
  refereeBonus,
  convertedCount,
  creditsEarned,
  cap,
}: {
  link: string;
  referrerReward: number;
  refereeBonus: number;
  convertedCount: number;
  creditsEarned: number;
  cap: number;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (insecure context, denied permission); the
      // link is selectable in the field, so there is nothing to recover here.
    }
  }

  const pct = Math.min(100, Math.round((convertedCount / cap) * 100));

  return (
    <div className="space-y-8">
      <div className="flex gap-2">
        <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="flex-1" />
        <Button type="button" onClick={copy} variant="outline" className="shrink-0">
          {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
          <span className="font-display ml-1">{copied ? "Copied" : "Copy"}</span>
        </Button>
      </div>

      <p className="font-display text-muted-foreground text-sm">
        Share your link. When someone signs up through it and makes their first purchase, they get{" "}
        <span className="text-foreground font-medium">{refereeBonus} bonus credits</span> and you
        earn <span className="text-foreground font-medium">{referrerReward} credits</span>.
      </p>

      <div className="space-y-2">
        <div className="font-display flex items-baseline justify-between text-sm">
          <span className="font-medium">
            {convertedCount} of {cap} rewards earned
          </span>
          <span className="text-muted-foreground">{creditsEarned} credits</span>
        </div>
        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {convertedCount >= cap && (
          <p className="font-display text-muted-foreground text-xs">
            You&apos;ve reached the referral reward cap. Thanks for spreading the word!
          </p>
        )}
      </div>
    </div>
  );
}
