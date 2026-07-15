"use client";

import Link from "next/link";

import { siteConfig } from "@/site";

import { useSession } from "@/lib/auth-client";

export function CtaSection() {
  const { data: session } = useSession();

  return (
    <section className="mx-auto w-full max-w-3xl border-t px-5 py-16">
      <div className="text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {siteConfig.cta.title}
        </h2>
        <p className="font-display text-muted-foreground mx-auto mt-2 max-w-md">
          {siteConfig.cta.subtitle}
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link
            href={session ? "/payments" : "/signin"}
            className="bg-tertiary font-display text-tertiary-foreground hover:bg-tertiary/90 inline-block cursor-pointer rounded-lg px-8 py-3 text-sm font-medium transition-colors">
            {session ? siteConfig.cta.signedInLabel : siteConfig.cta.signedOutLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
