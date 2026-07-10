"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CreditsBadge } from "@/components/credits-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import { signInWithGoogle, signOut, useSession } from "@/lib/auth-client";

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
    { href: "/pricing", label: "Pricing" },
  ];

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="group flex items-center gap-2">
            <span className="bg-primary relative inline-block h-3 w-3 rotate-45">
              <span className="bg-tertiary/30 absolute inset-0 rounded-sm opacity-0 blur-md transition-opacity group-hover:opacity-100" />
            </span>
            <span className="font-display text-sm font-semibold tracking-tight">
              Scouting Report
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
            <Button size="sm" onClick={() => signInWithGoogle({ callbackURL: "/prepare" })}>
              Sign in
            </Button>
          )}

          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
