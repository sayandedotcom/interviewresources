# Cookie Consent Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate Google Analytics / Vercel Analytics behind explicit user consent, shown via a bottom-bar banner, persisted in `localStorage`, reopenable from the footer.

**Architecture:** A single shared hook (`useCookieConsent`) reads/writes `localStorage["cookie-consent"]` and broadcasts changes via a `window` CustomEvent so every mounted instance (banner, `Analytics`, footer link) stays in sync within the same tab. `CookieConsentBanner` renders only while consent is undecided; `Analytics` renders GA/Vercel scripts only once consent is `"accepted"`; a footer button resets consent to `null` to reopen the banner.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, `@base-ui/react` `Button` (`components/ui/button.tsx`), Vitest + Testing Library (jsdom project), `@next/third-parties/google`, `@vercel/analytics/react`.

## Global Constraints

- Hooks live in `hooks/` (see `hooks/use-mobile.ts`), not `lib/hooks/` — deviates from the spec's stated path, following existing repo convention.
- Consent choice persisted in `localStorage` under key `"cookie-consent"`; values are the strings `"accepted"` or `"rejected"`; absence means undecided.
- No cookie is used for the consent flag itself.
- Component tests go in `jsdom` project (co-located `*.test.tsx` next to the component, per `components/credits-badge.test.tsx`).
- Follow existing styling conventions: `font-display` on nav/button text, `text-muted-foreground hover:text-foreground text-sm transition-colors` for footer-style links, `border-t` for divider lines, `Button` component from `components/ui/button.tsx` for actionable buttons (`variant="outline"` / default).
- Run `pnpm lint:check && pnpm format:check` before each commit (pre-commit hook already enforces this).

---

### Task 1: `useCookieConsent` hook

**Files:**

- Create: `hooks/use-cookie-consent.ts`
- Test: `hooks/use-cookie-consent.test.tsx`

**Interfaces:**

- Produces: `useCookieConsent(): { consent: "accepted" | "rejected" | null; setConsent: (c: "accepted" | "rejected" | null) => void }`
- Produces: exported type `CookieConsent = "accepted" | "rejected" | null` (used by Tasks 2 and 3)
- Produces: exported constant `COOKIE_CONSENT_STORAGE_KEY = "cookie-consent"` and `COOKIE_CONSENT_EVENT = "cookie-consent-change"` (used by Task 1's own listener; no other task needs to import these, but export them for the test)

Behavior:

- On first render, `consent` is `null` (SSR-safe — no `localStorage` access during render).
- In a `useEffect` on mount, read `localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)`. If it's `"accepted"` or `"rejected"`, set `consent` to that value.
- `setConsent(value)`:
  - If `value` is `null`, call `localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY)`. Otherwise `localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, value)`.
  - Update local state to `value`.
  - Dispatch `window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: value }))`.
- In the same mount `useEffect`, add a `window.addEventListener(COOKIE_CONSENT_EVENT, handler)` where `handler` reads `(e as CustomEvent<CookieConsent>).detail` and updates local state. Remove the listener on unmount.

- [ ] **Step 1: Write the failing test**

```tsx
// hooks/use-cookie-consent.test.tsx
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { COOKIE_CONSENT_STORAGE_KEY, useCookieConsent } from "./use-cookie-consent";

describe("useCookieConsent", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts as null when nothing is stored", () => {
    const { result } = renderHook(() => useCookieConsent());
    expect(result.current.consent).toBeNull();
  });

  it("reads a previously accepted consent from localStorage on mount", () => {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "accepted");
    const { result } = renderHook(() => useCookieConsent());
    expect(result.current.consent).toBe("accepted");
  });

  it("persists accept and updates state", () => {
    const { result } = renderHook(() => useCookieConsent());

    act(() => {
      result.current.setConsent("accepted");
    });

    expect(result.current.consent).toBe("accepted");
    expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe("accepted");
  });

  it("clearing consent removes it from localStorage", () => {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "rejected");
    const { result } = renderHook(() => useCookieConsent());

    act(() => {
      result.current.setConsent(null);
    });

    expect(result.current.consent).toBeNull();
    expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBeNull();
  });

  it("syncs a second hook instance in the same tab via the change event", () => {
    const a = renderHook(() => useCookieConsent());
    const b = renderHook(() => useCookieConsent());

    act(() => {
      a.result.current.setConsent("rejected");
    });

    expect(b.result.current.consent).toBe("rejected");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test hooks/use-cookie-consent.test.tsx`
Expected: FAIL — `Cannot find module './use-cookie-consent'`

- [ ] **Step 3: Write the implementation**

```ts
// hooks/use-cookie-consent.ts
"use client";

import * as React from "react";

export type CookieConsent = "accepted" | "rejected" | null;

export const COOKIE_CONSENT_STORAGE_KEY = "cookie-consent";
export const COOKIE_CONSENT_EVENT = "cookie-consent-change";

function readStoredConsent(): CookieConsent {
  const value = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  return value === "accepted" || value === "rejected" ? value : null;
}

export function useCookieConsent() {
  const [consent, setConsentState] = React.useState<CookieConsent>(null);

  React.useEffect(() => {
    setConsentState(readStoredConsent());

    const onChange = (event: Event) => {
      setConsentState((event as CustomEvent<CookieConsent>).detail);
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, onChange);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onChange);
  }, []);

  const setConsent = React.useCallback((value: CookieConsent) => {
    if (value === null) {
      window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
    } else {
      window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, value);
    }
    setConsentState(value);
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: value }));
  }, []);

  return { consent, setConsent };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test hooks/use-cookie-consent.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add hooks/use-cookie-consent.ts hooks/use-cookie-consent.test.tsx
git commit -m "feat: add useCookieConsent hook"
```

---

### Task 2: `CookieConsentBanner` component

**Files:**

- Create: `components/cookie-consent.tsx`
- Test: `components/cookie-consent.test.tsx`

**Interfaces:**

- Consumes: `useCookieConsent()` from `hooks/use-cookie-consent.ts` (Task 1) — `{ consent: CookieConsent; setConsent: (c: CookieConsent) => void }`
- Consumes: `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel` from `components/ui/alert-dialog.tsx` (existing primitives, base-ui backed)
- Produces: `export function CookieConsentBanner(): JSX.Element`, rendered in Task 4's `app/layout.tsx` change

Behavior:

- Track a local `mounted` boolean, set `true` in a `useEffect`, to avoid any SSR/CSR mismatch (default state is already `consent === null`, so there's no visible flash, but the dialog must not attempt to open before hydration).
- `<AlertDialog open={mounted && consent === null} onOpenChange={() => {}}>` — controlled open state; `onOpenChange` is a no-op so the dialog cannot be dismissed via outside click or Escape, only via the Accept/Reject buttons (a consent gate shouldn't be closable without an explicit choice).
- Content uses a 🍪 cookie emoji in the title, per explicit request:

```tsx
<AlertDialogContent>
  <AlertDialogHeader>
    <AlertDialogTitle>🍪 We value your privacy</AlertDialogTitle>
    <AlertDialogDescription>
      We use cookies to analyze traffic and improve your experience. See our{" "}
      <Link href="/cookies" className="text-foreground underline underline-offset-4">
        Cookie Policy
      </Link>{" "}
      for details.
    </AlertDialogDescription>
  </AlertDialogHeader>
  <AlertDialogFooter>
    <AlertDialogCancel onClick={() => setConsent("rejected")}>Reject</AlertDialogCancel>
    <AlertDialogAction onClick={() => setConsent("accepted")}>Accept</AlertDialogAction>
  </AlertDialogFooter>
</AlertDialogContent>
```

- [ ] **Step 1: Write the failing test**

```tsx
// components/cookie-consent.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { COOKIE_CONSENT_STORAGE_KEY } from "@/hooks/use-cookie-consent";

import { CookieConsentBanner } from "./cookie-consent";

describe("CookieConsentBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the dialog when no consent is stored", async () => {
    render(<CookieConsentBanner />);
    expect(await screen.findByText(/we value your privacy/i)).toBeInTheDocument();
  });

  it("does not show the dialog when consent was already accepted", () => {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "accepted");
    render(<CookieConsentBanner />);
    expect(screen.queryByText(/we value your privacy/i)).not.toBeInTheDocument();
  });

  it("hides the dialog and stores 'accepted' when Accept is clicked", async () => {
    const user = userEvent.setup();
    render(<CookieConsentBanner />);

    await user.click(await screen.findByRole("button", { name: "Accept" }));

    expect(screen.queryByText(/we value your privacy/i)).not.toBeInTheDocument();
    expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe("accepted");
  });

  it("hides the dialog and stores 'rejected' when Reject is clicked", async () => {
    const user = userEvent.setup();
    render(<CookieConsentBanner />);

    await user.click(await screen.findByRole("button", { name: "Reject" }));

    expect(screen.queryByText(/we value your privacy/i)).not.toBeInTheDocument();
    expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe("rejected");
  });

  it("links to the cookie policy page", async () => {
    render(<CookieConsentBanner />);
    const link = await screen.findByRole("link", { name: /cookie policy/i });
    expect(link).toHaveAttribute("href", "/cookies");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test components/cookie-consent.test.tsx`
Expected: FAIL — `Cannot find module './cookie-consent'`

- [ ] **Step 3: Write the implementation**

```tsx
// components/cookie-consent.tsx
"use client";

import * as React from "react";

import Link from "next/link";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useCookieConsent } from "@/hooks/use-cookie-consent";

export function CookieConsentBanner() {
  const { consent, setConsent } = useCookieConsent();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <AlertDialog open={mounted && consent === null} onOpenChange={() => {}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>🍪 We value your privacy</AlertDialogTitle>
          <AlertDialogDescription>
            We use cookies to analyze traffic and improve your experience. See our{" "}
            <Link href="/cookies" className="text-foreground underline underline-offset-4">
              Cookie Policy
            </Link>{" "}
            for details.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConsent("rejected")}>Reject</AlertDialogCancel>
          <AlertDialogAction onClick={() => setConsent("accepted")}>Accept</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test components/cookie-consent.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add components/cookie-consent.tsx components/cookie-consent.test.tsx
git commit -m "feat: add cookie consent dialog"
```

---

### Task 3: Gate `Analytics` on consent

**Files:**

- Modify: `components/analytics.tsx`
- Test: `components/analytics.test.tsx`

**Interfaces:**

- Consumes: `useCookieConsent()` from `hooks/use-cookie-consent.ts` (Task 1)
- Consumes existing: `env.NEXT_PUBLIC_GA_ID`, `GoogleAnalytics` from `@next/third-parties/google`, `Analytics as VercelAnalytics` from `@vercel/analytics/react`
- Produces: `export function Analytics()` (unchanged signature, now consent-gated) — consumed by `app/layout.tsx` (Task 4, no change needed there since the import/usage is unchanged)

Mock strategy for the test: mock both third-party packages with lightweight stand-ins so the test can assert on presence/absence without loading real GA/Vercel scripts.

- [ ] **Step 1: Write the failing test**

```tsx
// components/analytics.test.tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { COOKIE_CONSENT_STORAGE_KEY } from "@/hooks/use-cookie-consent";

import { Analytics } from "./analytics";

vi.mock("@next/third-parties/google", () => ({
  GoogleAnalytics: ({ gaId }: { gaId: string }) => (
    <div data-testid="google-analytics" data-ga-id={gaId} />
  ),
}));

vi.mock("@vercel/analytics/react", () => ({
  Analytics: () => <div data-testid="vercel-analytics" />,
}));

describe("Analytics", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("does not render analytics scripts when consent is undecided", () => {
    render(<Analytics />);
    expect(screen.queryByTestId("google-analytics")).not.toBeInTheDocument();
    expect(screen.queryByTestId("vercel-analytics")).not.toBeInTheDocument();
  });

  it("does not render analytics scripts when consent was rejected", () => {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "rejected");
    render(<Analytics />);
    expect(screen.queryByTestId("google-analytics")).not.toBeInTheDocument();
    expect(screen.queryByTestId("vercel-analytics")).not.toBeInTheDocument();
  });

  it("renders analytics scripts once consent is accepted", async () => {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "accepted");
    render(<Analytics />);
    expect(await screen.findByTestId("vercel-analytics")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test components/analytics.test.tsx`
Expected: FAIL — the two "does not render" assertions fail because `Analytics` currently renders unconditionally.

- [ ] **Step 3: Update the implementation**

```tsx
// components/analytics.tsx
"use client";

import { env } from "@/env";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";

import { useCookieConsent } from "@/hooks/use-cookie-consent";

export function Analytics() {
  const { consent } = useCookieConsent();

  if (consent !== "accepted") {
    return null;
  }

  return (
    <>
      {env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={env.NEXT_PUBLIC_GA_ID} />}
      <VercelAnalytics />
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test components/analytics.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add components/analytics.tsx components/analytics.test.tsx
git commit -m "feat: gate analytics scripts behind cookie consent"
```

---

### Task 4: Wire banner into layout, add footer "Cookie Preferences" link

**Files:**

- Modify: `app/layout.tsx:6,93` (add import, render banner)
- Create: `components/cookie-preferences-link.tsx`
- Modify: `components/footer.tsx:107-113` (add list item after "Cookie Policy")
- Test: `components/cookie-preferences-link.test.tsx`

**Interfaces:**

- Consumes: `useCookieConsent()` from `hooks/use-cookie-consent.ts` (Task 1)
- Consumes: `CookieConsentBanner` from `components/cookie-consent.tsx` (Task 2)
- Produces: `export function CookiePreferencesLink(): JSX.Element` — a `<button>` styled like the surrounding footer `<Link>`s, calling `setConsent(null)` on click. Rendered inside `Footer`.

`CookiePreferencesLink` step 1-4 (TDD for the new component), then a manual (non-TDD, since it's wiring with no new logic) edit to `app/layout.tsx` and `footer.tsx`.

- [ ] **Step 1: Write the failing test for `CookiePreferencesLink`**

```tsx
// components/cookie-preferences-link.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { COOKIE_CONSENT_STORAGE_KEY } from "@/hooks/use-cookie-consent";

import { CookiePreferencesLink } from "./cookie-preferences-link";

describe("CookiePreferencesLink", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders a button labeled Cookie Preferences", () => {
    render(<CookiePreferencesLink />);
    expect(screen.getByRole("button", { name: "Cookie Preferences" })).toBeInTheDocument();
  });

  it("clears stored consent when clicked", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "accepted");
    render(<CookiePreferencesLink />);

    await user.click(screen.getByRole("button", { name: "Cookie Preferences" }));

    expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test components/cookie-preferences-link.test.tsx`
Expected: FAIL — `Cannot find module './cookie-preferences-link'`

- [ ] **Step 3: Write the implementation**

```tsx
// components/cookie-preferences-link.tsx
"use client";

import { useCookieConsent } from "@/hooks/use-cookie-consent";

export function CookiePreferencesLink() {
  const { setConsent } = useCookieConsent();

  return (
    <button
      type="button"
      onClick={() => setConsent(null)}
      className="font-display text-muted-foreground hover:text-foreground text-sm transition-colors">
      Cookie Preferences
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test components/cookie-preferences-link.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Add the footer list item**

In `components/footer.tsx`, add the import and insert a new `<li>` immediately after the "Cookie Policy" `<li>` (after line 113, before the closing `</ul>` of the Legal column):

```tsx
import { CookiePreferencesLink } from "@/components/cookie-preferences-link";
```

```tsx
              <li>
                <Link
                  href="/cookies"
                  className="font-display text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <CookiePreferencesLink />
              </li>
```

- [ ] **Step 6: Render the banner in the root layout**

In `app/layout.tsx`, add the import next to the existing `Analytics` import:

```tsx
import { Analytics } from "@/components/analytics";
import { CookieConsentBanner } from "@/components/cookie-consent";
import { ThemeProvider } from "@/components/theme-provider";
```

Render it alongside `<Analytics />`:

```tsx
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
  {children}
  <Analytics />
  <CookieConsentBanner />
</ThemeProvider>
```

- [ ] **Step 7: Run the full test suite**

Run: `pnpm test`
Expected: PASS, all suites green (node + jsdom projects)

- [ ] **Step 8: Typecheck and lint**

Run: `pnpm lint:check && pnpm format:check && tsc --noEmit`
Expected: no errors (pre-existing warnings in unrelated files are fine; no new errors/warnings from the files touched in this task)

- [ ] **Step 9: Commit**

```bash
git add app/layout.tsx components/footer.tsx components/cookie-preferences-link.tsx components/cookie-preferences-link.test.tsx
git commit -m "feat: wire cookie consent banner into layout with footer reopen link"
```

---

### Task 5: Manual verification

**Files:** none (manual browser check only)

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`

- [ ] **Step 2: Verify first-visit behavior**

Open the app in a browser with no prior localStorage for this origin (or clear site data). Confirm:

- A modal dialog appears titled "🍪 We value your privacy", with the cookie message, a "Cookie Policy" link, and Accept/Reject buttons.
- Clicking the "Cookie Policy" link navigates to `/cookies`.

- [ ] **Step 3: Verify Accept flow**

Reload, click **Accept**. Confirm:

- Banner disappears immediately.
- `localStorage.getItem("cookie-consent")` is `"accepted"` (check via devtools console).
- Reloading the page does not show the banner again.
- Network tab shows the GA/Vercel analytics scripts loading (or check for `<script>` tags injected by `@next/third-parties/google` in the DOM).

- [ ] **Step 4: Verify Reject flow**

Clear `localStorage`, reload, click **Reject**. Confirm:

- Banner disappears.
- `localStorage.getItem("cookie-consent")` is `"rejected"`.
- No GA/Vercel scripts are present in the DOM.

- [ ] **Step 5: Verify footer reopen link**

With consent already set (accept or reject), scroll to the footer, click **Cookie Preferences**. Confirm:

- The banner reappears immediately (no reload needed).
- Choosing Accept/Reject again updates `localStorage` and hides the banner.

No commit for this task — it's verification only.

---

## Self-Review Notes

- Spec coverage: hook (Task 1), banner (Task 2), analytics gating (Task 3), layout wiring + footer reopen link (Task 4), manual verification (Task 5) — all spec sections covered.
- Deviation from spec: hook path is `hooks/use-cookie-consent.ts` instead of `lib/hooks/use-cookie-consent.ts`, to match the existing `hooks/use-mobile.ts` convention — called out in Global Constraints.
- Type consistency checked: `CookieConsent` type and `{ consent, setConsent }` shape from Task 1 used identically in Tasks 2, 3, and 4's `CookiePreferencesLink`.
