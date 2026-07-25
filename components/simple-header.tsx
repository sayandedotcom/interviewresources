import Link from "next/link";

import { siteConfig } from "@/site";

import { LogoMark } from "@/components/logo";

/** Light-background header for non-marketing pages (company/legal/support route
 * groups). `Header` assumes the dark blue hero wash and renders white-on-white
 * without it, so those pages get this instead. */
export function SimpleHeader() {
  return (
    <header className="border-border/50 w-full border-b">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 md:px-8">
        <Link href="/" className="group flex min-h-11 items-center gap-2.5">
          <LogoMark size="xl" glowClassName="bg-primary/40 opacity-0 group-hover:opacity-100" />
          <span className="font-display text-lg font-semibold tracking-tight sm:text-xl">
            {siteConfig.name}
          </span>
        </Link>
        <Link
          href="/"
          className="font-display text-muted-foreground hover:text-foreground min-h-11 text-sm font-medium transition-colors">
          ← Back to home
        </Link>
      </div>
    </header>
  );
}
