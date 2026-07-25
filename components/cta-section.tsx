"use client";

import Link from "next/link";

import { siteConfig } from "@/site";
import { ChevronRight } from "lucide-react";

import { useSession } from "@/lib/auth-client";

export function CtaSection() {
  const { data: session } = useSession();

  return (
    <section className="w-full [background-image:var(--wash-band)]">
      <div className="mx-auto w-full max-w-3xl px-6 py-24 text-center md:px-8">
        <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {siteConfig.cta.title}
        </h2>
        <p className="font-display text-muted-foreground mx-auto mt-4 max-w-lg text-lg leading-relaxed">
          {siteConfig.cta.subtitle}
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link
            href={session ? "/payments" : "/signin"}
            aria-label={session ? undefined : siteConfig.cta.signedOutAriaLabel}
            className="font-display ease-out-strong inline-flex cursor-pointer items-center gap-1 rounded-full bg-[image:var(--gradient-glossy)] px-8 py-3 text-sm font-semibold text-white shadow-[var(--shadow-glossy)] transition-[box-shadow,translate,scale] duration-150 [text-shadow:0_1px_1px_oklch(0.25_0.09_255/0.35)] hover:bg-[image:var(--gradient-glossy-hover)] hover:shadow-[var(--shadow-glossy-hover)] active:translate-y-px active:scale-[0.98] active:shadow-[var(--shadow-glossy-active)]">
            {session ? siteConfig.cta.signedInLabel : siteConfig.cta.signedOutLabel}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="font-display text-muted-foreground mt-8 text-xl font-medium italic">
          {siteConfig.cta.closer}
        </p>
      </div>
    </section>
  );
}
