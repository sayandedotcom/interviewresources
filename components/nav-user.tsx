"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ChevronsUpDownIcon,
  CreditCardIcon,
  GiftIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
} from "lucide-react";
import { useTheme } from "next-themes";

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
import { cn } from "@/lib/utils";

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

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
] as const;

/** A 3-way segmented control rather than DropdownMenuItems: picking a theme
 * shouldn't close the menu, so the choice can be compared before moving on.
 * `mounted` guards the active state — next-themes doesn't know `theme` until
 * after the client reads localStorage, so rendering it during SSR would
 * disagree with the client's first render and every option would flash
 * unselected → selected on hydration. */
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex items-center gap-1 px-1.5 py-1">
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={mounted && theme === value}
          onClick={() => setTheme(value)}
          className={cn(
            "flex flex-1 items-center justify-center rounded-md py-1.5 transition-colors",
            mounted && theme === value
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
          )}>
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}

/** `initialUser` is the server's answer: a `SessionUser`, or null for signed out.
 * `initialBalance` is the server's credit count, so the menu shows the real
 * number on first paint instead of fetching `/api/me` after hydration. */
export function NavUser({
  initialUser,
  initialBalance,
}: {
  initialUser: SessionUser | null;
  initialBalance: number;
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [balance] = useState(initialBalance);

  // Until `useSession` has an answer of its own, the server's stands. After that
  // it wins, so signing out empties the row instead of stranding a stale name.
  const user = isPending ? initialUser : (session?.user ?? null);

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
                <span className="font-display">{`${balance} credits · buy more`}</span>
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
            <ThemeToggle />
            <DropdownMenuSeparator />
            {/* `signOut` only clears the cookie; the `/prepare` → `/` redirect
                lives in proxy.ts and won't fire until a new request. Navigate
                on success so logout lands home immediately, not on refresh. */}
            <DropdownMenuItem
              onClick={() => signOut({ fetchOptions: { onSuccess: () => router.push("/") } })}>
              <LogOutIcon />
              <span className="font-display">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
