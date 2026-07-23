"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { siteConfig } from "@/site";

import { CreditsBadge } from "@/components/credits-badge";
import { LogoMark } from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import { signOut, useSession } from "@/lib/auth-client";

export function Header() {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.signedIn) setBalance(data.balance);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session]);

  // `show` is per-link because they don't all fit at the same width: two links
  // clear the wordmark and CTA at sm, but a third overflows the viewport until
  // md. Every destination is also in the footer, so dropping one costs nothing.
  const navLinks = [
    { href: "/#how-it-works", label: "How it works", show: "sm:inline" },
    { href: "/#how-agent-works", label: "Under the hood", show: "md:inline" },
    { href: "/#pricing", label: "Pricing", show: "sm:inline" },
  ];

  return (
    <header className="relative z-40 w-full">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 md:px-8">
        <div className="flex items-center gap-2">
          <Link href="/" className="group flex items-center gap-2.5">
            <LogoMark
              size="xl"
              variant="inverted"
              glowClassName="bg-white/40 opacity-0 group-hover:opacity-100"
            />
            <span className="font-display truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
              {siteConfig.name}
            </span>
          </Link>
        </div>
        {/* The nav links don't fit alongside the wordmark and CTA on phones, so
            they drop out below sm — the same destinations are in the footer. */}
        <nav className="flex shrink-0 items-center gap-4 sm:gap-7">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-display hidden text-base font-medium transition-colors ${link.show} ${
                pathname === link.href ? "text-white" : "text-white/80 hover:text-white"
              }`}>
              {link.label}
            </Link>
          ))}

          {!isPending && session?.user && (
            <>
              <Avatar size="sm">
                <AvatarImage src={session.user.image ?? undefined} />
                <AvatarFallback>{session.user.name?.[0] ?? "?"}</AvatarFallback>
              </Avatar>
              <Link href="/payments">
                <CreditsBadge balance={balance} />
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="text-white/80 hover:bg-white/10 hover:text-white"
                onClick={() => signOut()}>
                Sign out
              </Button>
            </>
          )}
          {!isPending && !session && (
            <Link
              href="/signin"
              className="text-brand-700 font-display inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-full bg-[image:var(--gradient-glossy-white)] px-5 text-sm font-semibold shadow-[var(--shadow-glossy-white)] transition-all hover:bg-[image:var(--gradient-glossy-white-hover)] hover:shadow-[var(--shadow-glossy-white-hover)] active:translate-y-px active:shadow-[var(--shadow-glossy-white-active)]">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
