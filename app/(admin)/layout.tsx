import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";
import { noIndexMetadata } from "@/lib/seo/metadata";

// Covers /admin and /admin/runs. robots.ts also disallows /admin, but this is
// what actually keeps it out of the index if the path is ever discovered.
export const metadata = noIndexMetadata;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center gap-6">
        <span className="font-display text-sm font-semibold tracking-tight">Admin</span>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/admin" className="text-muted-foreground hover:text-foreground">
            Overview
          </Link>
          <Link href="/admin/runs" className="text-muted-foreground hover:text-foreground">
            Runs
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
