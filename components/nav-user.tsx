"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import {
  ChevronsUpDownIcon,
  CreditCardIcon,
  GiftIcon,
  LogOutIcon,
  SettingsIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { signOut, useSession } from "@/lib/auth-client";
import type { SessionUser } from "@/lib/session";

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

/** `initialUser` is the server's answer: a `SessionUser`, or null for signed out. */
export function NavUser({ initialUser }: { initialUser: SessionUser | null }) {
  const { isMobile } = useSidebar();
  const { data: session, isPending } = useSession();
  const [balance, setBalance] = useState<number | null>(null);

  // Until `useSession` has an answer of its own, the server's stands. After that
  // it wins, so signing out empties the row instead of stranding a stale name.
  const user = isPending ? initialUser : (session?.user ?? null);
  const userId = user?.id ?? null;

  // Only the balance needs `/api/me`, and it lives one click deep in the menu.
  // Blocking the whole row on it is what made the profile take so long to appear.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.signedIn) setBalance(data.balance);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <Link
            href="/signin"
            className="bg-primary font-display text-primary-foreground hover:bg-primary/80 inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-[min(12px,var(--radius-md))] px-2.5 text-[0.8rem] font-medium">
            Sign in
          </Link>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="bg-sidebar-accent/60 border-sidebar-border aria-expanded:bg-sidebar-accent border group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:!p-0"
              />
            }>
            <Avatar className="rounded-md group-data-[collapsible=icon]:size-6">
              <AvatarImage src={user.image ?? undefined} alt={user.name} className="rounded-md" />
              <AvatarFallback className="rounded-md">{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="font-display truncate font-medium">{user.name}</span>
              <span className="font-display truncate text-xs">{user.email}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-fit"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar>
                    <AvatarImage src={user.image ?? undefined} alt={user.name} />
                    <AvatarFallback>{initials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="font-display truncate font-medium">{user.name}</span>
                    <span className="font-display truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link href="/payments" />}>
                <CreditCardIcon />
                <span className="font-display">
                  {balance == null ? "Credits · buy more" : `${balance} credits · buy more`}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/referrals" />}>
                <GiftIcon />
                <span className="font-display">Refer a friend</span>
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/settings" />}>
                <SettingsIcon />
                <span className="font-display">Settings</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOutIcon />
              <span className="font-display">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
