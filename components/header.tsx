"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
          <Link href="/" className="flex items-center gap-2 group">
            <span className="inline-block h-3 w-3 rotate-45 bg-primary relative">
              <span className="absolute inset-0 rounded-sm bg-tertiary/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
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
              }`}
            >
              {link.label}
            </Link>
          ))}

          {!isPending && session && (
            <>
              <Link href="/payments">
                <Badge variant="secondary" className="font-mono text-[10px] tracking-widest">
                  {balance === null ? "—" : `${balance} CR`}
                </Badge>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Sign out
              </Button>
            </>
          )}
          {!isPending && !session && (
            <Button size="sm" onClick={() => signInWithGoogle()}>
              Sign in
            </Button>
          )}

          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
