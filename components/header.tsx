"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { siteConfig } from "@/site";
import { Menu } from "lucide-react";

import { CreditsBadge } from "@/components/credits-badge";
import { LogoMark } from "@/components/logo";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { signOut, useSession } from "@/lib/auth-client";
import { CREDIT_PACKS_BY_SLUG } from "@/lib/economics";

const NAV_LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#how-agent-works", label: "Under the hood" },
  { href: "/#why-us", label: "Why us" },
  { href: "/#trust", label: "Trust" },
  { href: "/#pricing", label: "Pricing" },
];
const STARTER_PRICE = `$${(CREDIT_PACKS_BY_SLUG.starter.priceUsdMinor / 100).toFixed(2)}`;

function Brand() {
  return (
    <Link href="/" className="group flex min-h-11 items-center gap-2.5">
      <LogoMark
        size="xl"
        variant="inverted"
        glowClassName="bg-white/40 opacity-0 group-hover:opacity-100"
      />
      <span className="font-display hidden text-lg font-semibold tracking-tight text-white min-[400px]:inline sm:text-xl">
        {siteConfig.name}
      </span>
    </Link>
  );
}

function SignedOutCta({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/signin"
      aria-label={
        compact
          ? `Start for ${STARTER_PRICE} — sign in to get started`
          : `Try it for ${STARTER_PRICE} — sign in to get started`
      }
      className={`text-brand-700 font-display inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-glossy-white)] text-sm font-semibold shadow-[var(--shadow-glossy-white)] transition-all hover:bg-[image:var(--gradient-glossy-white-hover)] hover:shadow-[var(--shadow-glossy-white-hover)] active:translate-y-px active:shadow-[var(--shadow-glossy-white-active)] ${
        compact ? "px-4" : "px-5"
      }`}>
      {compact ? "Start preparing" : `Try it for ${STARTER_PRICE}`}
    </Link>
  );
}

export function Header() {
  const { data: session, isPending } = useSession();
  const [balance, setBalance] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!session?.user) return;

    let cancelled = false;
    fetch("/api/me")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && data.signedIn) setBalance(data.balance);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [session]);

  const signedIn = !isPending && !!session?.user;

  return (
    <header className="relative z-40 w-full">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-[auto_1fr] items-center gap-4 px-4 py-5 sm:px-6 md:px-8 lg:grid-cols-[1fr_auto_1fr]">
        <div className="flex min-w-0 items-center">
          <Brand />
        </div>

        <nav className="hidden items-center justify-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-display flex min-h-11 items-center text-sm font-medium text-white/80 transition-colors hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center justify-end gap-3 lg:flex">
          {signedIn ? (
            <>
              <Link href="/payments">
                <CreditsBadge balance={balance} />
              </Link>
              <Link
                href="/prepare"
                className="font-display inline-flex min-h-11 items-center rounded-full bg-[image:var(--gradient-glossy-ghost)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-glossy-ghost)] transition-all hover:bg-[image:var(--gradient-glossy-ghost-hover)] hover:shadow-[var(--shadow-glossy-ghost-hover)]">
                Open app
              </Link>
              <button
                type="button"
                className="font-display min-h-11 cursor-pointer text-sm font-medium text-white/80 transition-colors hover:text-white"
                onClick={() => signOut()}>
                Sign out
              </button>
            </>
          ) : (
            <SignedOutCta />
          )}
        </div>

        <div className="col-start-2 flex items-center justify-end gap-2 lg:hidden">
          {!signedIn && <SignedOutCta compact />}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm"
                  aria-label="Open navigation menu"
                />
              }>
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[88vw] max-w-sm border-none p-0">
              <div className="bg-brand-950 flex h-full flex-col text-white">
                <div className="border-b border-white/10 p-5">
                  <SheetTitle className="font-display text-white">{siteConfig.name}</SheetTitle>
                  <SheetDescription className="mt-2 text-white/70">
                    Evidence-first interview research for specific companies.
                  </SheetDescription>
                </div>
                <nav className="flex flex-col gap-2 p-5">
                  {NAV_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="font-display flex min-h-11 items-center rounded-2xl border border-white/10 px-4 text-base font-medium hover:bg-white/5"
                      onClick={() => setMenuOpen(false)}>
                      {link.label}
                    </Link>
                  ))}
                </nav>
                <div className="mt-auto border-t border-white/10 p-5">
                  {signedIn ? (
                    <div className="space-y-3">
                      <Link href="/payments" className="block">
                        <CreditsBadge balance={balance} />
                      </Link>
                      <Link
                        href="/prepare"
                        className="font-display text-brand-700 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[image:var(--gradient-glossy-white)] px-5 text-sm font-semibold"
                        onClick={() => setMenuOpen(false)}>
                        Open app
                      </Link>
                      <button
                        type="button"
                        className="font-display min-h-11 cursor-pointer text-sm font-medium text-white/80"
                        onClick={() => signOut()}>
                        Sign out
                      </button>
                    </div>
                  ) : (
                    <SignedOutCta />
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
