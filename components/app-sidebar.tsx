"use client";

import * as React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PlusIcon } from "lucide-react";

import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

import { useSession } from "@/lib/auth-client";
import { categoryLabel } from "@/lib/research/display";

interface ResearchSession {
  id: string;
  companyName: string;
  interviewType: string;
  status: string;
  createdAt: string;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const [fetched, setFetched] = React.useState<ResearchSession[] | null>(null);

  React.useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetch("/api/researches")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setFetched(data.sessions);
      })
      .catch(() => {
        if (!cancelled) setFetched([]);
      });
    return () => {
      cancelled = true;
    };
    // Refetch on navigation too, so a session created via `onComplete` shows
    // up in the list without a full reload.
  }, [session, pathname]);

  const sessions = session ? fetched : isPending ? null : [];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              render={<Link href="/prepare" />}>
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <PlusIcon className="size-4" />
              </div>
              <span className="font-display font-medium">New session</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-display">Sessions</SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            {sessions === null &&
              Array.from({ length: 3 }).map((_, i) => (
                <SidebarMenuItem key={i}>
                  <Skeleton className="h-12 w-full" />
                </SidebarMenuItem>
              ))}
            {sessions?.length === 0 && (
              <SidebarMenuItem>
                <span className="font-display text-sidebar-foreground/70 px-2 py-1.5 text-xs">
                  {session ? "No sessions yet" : "Sign in to save sessions"}
                </span>
              </SidebarMenuItem>
            )}
            {sessions?.map((s) => (
              <SidebarMenuItem key={s.id}>
                <SidebarMenuButton
                  size="lg"
                  isActive={pathname === `/prepare/${s.id}`}
                  render={<Link href={`/prepare/${s.id}`} />}>
                  <div className="flex min-w-0 flex-col gap-0.5 py-1">
                    <span className="font-display truncate">{s.companyName}</span>
                    <span className="font-display text-sidebar-foreground/60 truncate text-xs">
                      {s.interviewType
                        .split(",")
                        .map((c) => categoryLabel(c))
                        .join(", ")}
                    </span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
