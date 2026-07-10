import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { EXPIRED_PARAM } from "@/proxy";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { getSessionUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser(await headers());

  if (!user) redirect(`/?${EXPIRED_PARAM}=expired`);

  return (
    <SidebarProvider>
      <AppSidebar initialUser={user} />
      <SidebarInset>
        <div className="flex flex-1 flex-col p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
