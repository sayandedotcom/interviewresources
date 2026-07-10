import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { EXPIRED_PARAM } from "@/proxy";

import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { getSessionUser } from "@/lib/session";

export default async function PrepareLayout({ children }: { children: React.ReactNode }) {
  // Resolved here so the profile row and the session list ship in the first
  // paint. Left to the client, both wait on a `/api/auth/get-session` roundtrip
  // that this render has already paid for.
  const user = await getSessionUser(await headers());

  // The proxy only saw that a cookie existed. This is where the session is
  // actually resolved, so a revoked or expired one stops here. The param tells
  // the proxy not to bounce the request straight back.
  if (!user) redirect(`/?${EXPIRED_PARAM}=expired`);

  return (
    <SidebarProvider>
      <AppSidebar initialUser={user} />
      <SidebarInset>
        {/* <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <span className="font-display text-sm font-semibold tracking-tight">Prepare</span>
          </div>
        </header> */}
        <div className="flex flex-1 flex-col p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
