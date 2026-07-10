# Cookie Consent Banner

## Problem

`components/analytics.tsx` mounts `GoogleAnalytics` and Vercel `Analytics` unconditionally in `app/layout.tsx`. There's a `/cookies` policy page describing Essential/Analytics/Preference cookies, but no actual consent mechanism gating analytics cookies. This is a compliance gap (GDPR/ePrivacy) and the feature to build.

## Scope

- Gate `GoogleAnalytics` + Vercel `Analytics` behind explicit user consent (accept/reject).
- Bottom bar banner with Accept / Reject buttons, shown once until a choice is made.
- Choice persisted in `localStorage` (no cookie needed for the consent flag itself).
- A "Cookie Preferences" link in the footer lets users reopen the banner and change their choice later.

Out of scope: granular per-category toggles (analytics vs preference cookies) — binary accept/reject only, matching the existing site's cookie categories collapsed into one decision.

## Design

### `lib/hooks/use-cookie-consent.ts`

A small client hook shared by the banner and `Analytics`:

```ts
type Consent = "accepted" | "rejected" | null;
function useCookieConsent(): { consent: Consent; setConsent: (c: Consent) => void };
```

- Reads/writes `localStorage["cookie-consent"]`.
- On mount, `consent` starts `null` (unknown/SSR-safe) and syncs from localStorage in a `useEffect`.
- `setConsent` writes to localStorage and dispatches a `window` CustomEvent (`"cookie-consent-change"`) so other mounted instances of the hook (banner + `Analytics`, potentially in different components) update immediately within the same tab — native `storage` events don't fire in the originating tab.
- Listens for that same event to stay in sync.

### `components/cookie-consent.tsx`

- `"use client"` component rendered in `app/layout.tsx` next to `<Analytics />`.
- Uses `useCookieConsent()`. Renders nothing if `consent !== null` (already decided) or before mount.
- Otherwise renders a fixed bottom bar (`fixed inset-x-0 bottom-0 border-t bg-background`, similar treatment to `Footer`'s border/spacing) containing:
  - Short copy: "We use cookies to analyze traffic and improve your experience. See our [Cookie Policy](/cookies)."
  - **Reject** button (`variant="outline"` or `"ghost"`) → `setConsent("rejected")`
  - **Accept** button (primary) → `setConsent("accepted")`
- Exports a second small component/trigger for reopening: actually, reopening is handled by the footer link calling `setConsent(null)` directly via the hook (see below), which makes the banner reappear since `consent === null` again.

### `components/analytics.tsx`

- Add `"use client"` (already present) usage of `useCookieConsent()`.
- Only render `GoogleAnalytics`/`VercelAnalytics` when `consent === "accepted"`.

### Footer link

- `components/footer.tsx` has a "Legal" column (`/privacy-policy`, `/terms-of-service`, `/cookies`, `/security`). Add a "Cookie Preferences" item as the last `<li>` in that column, right after "Cookie Policy". Since it needs to trigger client state (`setConsent(null)`), it can't be a plain `<Link>`; it becomes a small client component (`components/cookie-preferences-link.tsx`, styled as a `<button>` matching the existing link's classes) using the same hook, rendered inside `Footer`.

### Data flow summary

```
useCookieConsent (localStorage + CustomEvent)
        ├── CookieConsentBanner (shows when consent === null, sets accepted/rejected)
        ├── Analytics (gates GA/Vercel on consent === "accepted")
        └── CookiePreferencesLink in Footer (sets consent back to null to reopen banner)
```

## Testing

- `components/cookie-consent.test.tsx` (jsdom): banner renders with no stored consent; Accept/Reject click hides it and persists to localStorage; doesn't render when consent already set.
- `components/analytics.test.tsx` (jsdom, new): GA/Vercel components aren't rendered until consent is `"accepted"`.
- Manual: `pnpm dev`, verify banner appears on first visit, Accept/Reject dismiss it, refresh keeps it dismissed, footer link reopens it.
