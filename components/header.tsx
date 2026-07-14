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

import { ThemeToggle } from "./theme-toggle";

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

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/how-it-works", label: "How it works" },
    { href: "/#pricing", label: "Pricing" },
  ];

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="group flex items-center gap-2">
            <LogoMark size="lg" glowClassName="bg-tertiary/30 opacity-0 group-hover:opacity-100" />
            <span className="font-display text-sm font-semibold tracking-tight">
              {siteConfig.name}
            </span>
          </Link>
        </div>
        <nav className="flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-display text-sm transition-colors ${
                pathname === link.href
                  ? "text-tertiary"
                  : "text-muted-foreground hover:text-foreground"
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
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Sign out
              </Button>
            </>
          )}
          {!isPending && !session && (
            <Link
              href="/signin"
              className="bg-primary font-display text-primary-foreground hover:bg-primary/80 inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-[min(12px,var(--radius-md))] px-2.5 text-[0.8rem] font-medium">
              Sign in
            </Link>
          )}

          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
