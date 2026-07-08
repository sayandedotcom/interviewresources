import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rotate-45 bg-primary" aria-hidden />
            <span className="font-display text-sm font-semibold tracking-tight">
              Scouting Report
            </span>
          </Link>
        </div>
        <nav className="flex items-center gap-6">
          <Link href="/" className="font-display text-sm text-muted-foreground hover:text-foreground transition-colors">
            Home
          </Link>
          <Link href="/how-it-works" className="font-display text-sm text-muted-foreground hover:text-foreground transition-colors">
            How it works
          </Link>
          <Link href="/pricing" className="font-display text-sm text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </Link>
          <a href="#" className="font-display text-sm text-muted-foreground hover:text-foreground transition-colors">
            About
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
