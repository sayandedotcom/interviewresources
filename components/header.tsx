"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/how-it-works", label: "How it works" },
    { href: "/pricing", label: "Pricing" },
    { href: "#", label: "About" },
  ];

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="inline-block h-3 w-3 rotate-45 bg-primary relative">
              <span className="absolute inset-0 rounded-sm bg-[#AEF05A]/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
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
                  ? "text-[#AEF05A]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
