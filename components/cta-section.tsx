"use client";

import Link from "next/link";

import { useSession } from "@/lib/auth-client";

export function CtaSection() {
  const { data: session, isPending } = useSession();

  return (
    <section className="mx-auto w-full max-w-3xl border-t px-5 py-16">
      <div className="text-center">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Ready to embark on your interview prep journey?
        </h2>
        <div className="mt-6 flex justify-center gap-4">
          <Link
            href={session ? "/payments" : "/signin"}
            className="bg-tertiary font-display text-tertiary-foreground hover:bg-tertiary/90 inline-block cursor-pointer rounded-lg px-8 py-3 text-sm font-medium transition-colors">
            {session ? "Get started" : "Join now to start preparing"}
          </Link>
        </div>
      </div>
    </section>
  );
}
