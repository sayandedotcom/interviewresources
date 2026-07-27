"use client";

import { usePathname } from "next/navigation";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// The route prefixes that get a theme choice at all. Every other route is
// forced light regardless of OS preference or a stored choice — this list
// *is* the scoping policy. Keep it in sync with app/(app)'s route segments.
const APP_ROUTES = ["/prepare", "/payments", "/referrals", "/settings"];

function isAppRoute(pathname: string) {
  return APP_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * Single root provider for the whole site. Do NOT nest another
 * `<ThemeProvider>` in a marketing layout to "force light" there — next-themes
 * treats a provider as a no-op once one is already mounted above it (it just
 * renders a Fragment and drops every prop), so a second provider silently does
 * nothing. Scoping instead happens by switching `forcedTheme` on the one
 * provider based on the current route, which next-themes does react to on
 * client-side navigation.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const forcedTheme = isAppRoute(pathname) ? undefined : "light";

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      forcedTheme={forcedTheme}>
      {children}
    </NextThemesProvider>
  );
}
