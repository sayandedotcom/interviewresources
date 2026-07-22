import { redirect } from "next/navigation";

import { EXPIRED_PARAM } from "@/proxy";

import { AppSidebar } from "@/components/app-sidebar";
import { DotBackground } from "@/components/dot-background";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { getBalance } from "@/lib/credits";
import { MAX_SESSIONS_PER_USER, getUserResearches } from "@/lib/research/sessions";
import { getCurrentUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect(`/?${EXPIRED_PARAM}=expired`);

  // Fetch the shell's data here so the sidebar renders complete on first paint,
  // instead of each client component doing its own `useEffect` roundtrip after
  // hydration (which flashed skeletons and a null credit count).
  const [balance, sessions] = await Promise.all([getBalance(user.id), getUserResearches(user.id)]);

  return (
    <SidebarProvider>
      <AppSidebar
        initialUser={user}
        initialBalance={balance}
        initialSessions={sessions}
        initialLimit={MAX_SESSIONS_PER_USER}
      />
      <SidebarInset className="bg-brand-50/40">
        <DotBackground className="flex flex-1 flex-col p-6 pt-0">
          <div className="bg-card flex flex-1 flex-col rounded-2xl shadow-[var(--shadow-sm)]">
            {children}
          </div>
        </DotBackground>
      </SidebarInset>
    </SidebarProvider>
  );
}
