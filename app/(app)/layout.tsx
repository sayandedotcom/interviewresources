import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { EXPIRED_PARAM } from "@/proxy";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { getBalance } from "@/lib/credits";
import { MAX_SESSIONS_PER_USER, getUserResearches } from "@/lib/research/sessions";
import { getSessionUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser(await headers());

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
      <SidebarInset>
        <div className="flex flex-1 flex-col p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
