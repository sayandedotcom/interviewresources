# Referral Program — Design

## Context

Users can share a personal referral link. When someone signs up through that link
and later makes their **first purchase** of any credit pack, the referrer earns
**100 credits** and the referred user gets a **50-credit bonus**, capped at **10
converted referrals per referrer** (max 1,000 credits earned). The goal is to
grow paid signups with a bounded, abuse-resistant incentive.

## Policy

- Flat reward: referrer +100 credits, referee +50 credits.
- Both grants fire on the referee's **first** successful purchase (any pack).
- Cap: 10 rewarded referrals per referrer. The referee bonus is uncapped and
  independent — a maxed-out referrer still gives friends their signup bonus.

## Data model

Two nullable columns on `users` (migration `drizzle/0001_square_ares.sql`); no
separate referrals table — reward state is derived from `credits_ledger`:

- `referral_code text UNIQUE` — the user's own share code, generated lazily.
- `referred_by uuid → users.id` — set once at signup.

Ledger conventions (existing `credits_ledger`, unchanged):

- Referrer reward: `delta=+100, reason='referral_reward', payment_ref='referral:<referredUserId>'`
- Referee bonus: `delta=+50, reason='referral_bonus', payment_ref='referral-bonus:<referredUserId>'`

The unique `payment_ref` makes both grants idempotent via `grantCredits()`.

## Flow

1. **Link capture** (`proxy.ts`): `…/?ref=CODE` on a signed-out visit sets an
   httpOnly `referral_code` cookie (30-day). `/signin` added to the matcher.
2. **Attribution** (`lib/auth.ts` `databaseHooks.user.create.after`): reads the
   cookie, resolves the referrer, sets `referred_by` on the new user, clears the
   cookie. Best-effort — a failure never breaks signup. No credits move yet.
3. **Payout** (`lib/referrals.ts` `processReferralReward`, called from the Dodo
   webhook after the purchase grant newly lands): bails if the buyer has no
   referrer; confirms this is the buyer's first `purchase:%` ledger row; under a
   `FOR UPDATE` lock on the referrer, grants +100 if under the cap; grants the
   referee +50 unconditionally. Wrapped in try/catch so it can never roll back
   the purchase.
4. **Surface** (`app/api/referrals/route.ts`, `app/(app)/referrals/page.tsx`,
   `components/nav-user.tsx`): a "Refer a friend" page with the link, a copy
   button, and progress toward the cap; a dropdown entry linking to it.

## Edge cases

- Self-referral is impossible (a new user owns no code); farming is bounded by
  the cap and by requiring a real paid purchase.
- Existing user clicking a referral link: `user.create.after` never fires, so
  nothing happens.
- Webhook redelivery: purchase grant returns false → payout is skipped; even if
  called, all grants are idempotent.
- Unknown/stale cookie code: attribution silently skipped, cookie still cleared.

## Testing

`tests/db/referrals.test.ts` (PGlite): code generation/stability/uniqueness,
code→referrer resolution, first-purchase payout of both sides, no-referrer
no-op, second-purchase no-op, idempotency, cap enforcement, referee bonus
survives the cap, empty stats. `tsc`, eslint, and prettier all clean.
