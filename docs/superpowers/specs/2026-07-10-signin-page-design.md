# Sign-In Page Design

**Date:** 2026-07-10
**Status:** Approved

## Overview

Create a dedicated `/signin` page that provides both email sign-in and Google sign-in options. Email sign-in will be disabled in the UI (grayed out/not clickable) but the form fields will be present for future activation.

## Decisions

- **URL:** `/signin`
- **Redirect after success:** `/prepare`
- **Scope:** Sign-in only (no sign-up tab)
- **Email sign-in:** UI present but disabled

## Page Layout

```
/signin
├── Header (existing site header)
├── Main content (centered card)
│   ├── Page title: "Sign in to [Site Name]"
│   ├── Google sign-in button (primary)
│   ├── Divider: "or continue with email"
│   ├── Email input field (disabled)
│   ├── Password input field (disabled)
│   ├── Sign in button (disabled)
│   └── Note: "Email sign-in coming soon"
└── Footer (existing site footer)
```

## Components

### Sign-In Card

- Uses existing `Card`, `CardHeader`, `CardTitle`, `CardContent` components
- Centered on page with max-width constraint
- ClassName: `mx-auto w-full max-w-sm`

### Google Sign-In Button

- Uses existing `Button` component with Google icon
- Variant: outline or default
- On click: calls `signInWithGoogle({ callbackURL: "/prepare" })`
- SVG icon: Google "G" logo (inline)

### Email Form Fields

- Email input: `Input` component with `type="email"`, disabled
- Password input: `Input` component with `type="password"`, disabled
- Both wrapped in existing `Form`, `FormField`, `FormLabel`, `FormItem` components

### Disabled State

- Form fields disabled with `disabled` attribute
- Sign-in button disabled with `disabled` attribute
- Note text below: "Email sign-in coming soon" in muted text

## File Structure

```
app/
└── (marketing)/
    └── signin/
        └── page.tsx          # New sign-in page
```

## Changes to Existing Code

### Header (`components/header.tsx`)

- Change "Sign in" button from `onClick={() => signInWithGoogle(...)}` to `<Link href="/signin">Sign in</Link>`
- Same change for nav-user sidebar component

### Auth Config (`lib/auth.ts`)

- No changes needed — email is already `enabled: false`
- When ready to enable email, flip to `enabled: true`

## Implementation Notes

1. Follow existing component patterns (shadcn/ui style)
2. Use `siteConfig.name` for page title
3. The page is a Server Component by default; add `"use client"` only if needed for interactivity
4. Google sign-in uses existing `signInWithGoogle` from `@/lib/auth-client`
