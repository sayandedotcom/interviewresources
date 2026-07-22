"use client";

import * as React from "react";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { siteConfig } from "@/site";
import {
  Gift,
  Loader2Icon,
  MessageSquareIcon,
  MoreHorizontalIcon,
  PlusIcon,
  Share2Icon,
  Trash2Icon,
} from "lucide-react";

import { LogoMark } from "@/components/logo";
import { NavCredits } from "@/components/nav-credits";
import { NavUser } from "@/components/nav-user";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

import { useSession } from "@/lib/auth-client";
import { categoryLabel } from "@/lib/research/display";
import type { ResearchSummary } from "@/lib/research/sessions";
import type { SessionUser } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * Acknowledges the click while the destination renders. Must live inside the
 * `Link`, and only lights up when a prefetch hasn't already made the navigation
 * instant. Always rendered and toggled by opacity — appearing on demand would
 * shift the row it sits in.
 */
function NavPendingHint({ className }: { className?: string }) {
  const { pending } = useLinkStatus();

  return (
    <Loader2Icon
      aria-hidden
      className={cn(
        "ml-auto size-3.5 shrink-0 animate-spin transition-opacity",
        pending ? "opacity-70" : "opacity-0",
        className
      )}
    />
  );
}

/**
 * Selected nav and session rows take the brand tint from the "Report Sections"
 * chips rather than the default sidebar-accent wash. Mirrors `chipOn` in
 * features/research/toggle-chip.tsx minus its border — kept as its own string
 * rather than imported so the app shell doesn't depend on a research feature
 * module.
 */
const navItemActive =
  "data-active:bg-primary/10 data-active:text-primary data-active:hover:bg-primary/15 data-active:hover:text-primary";

export function AppSidebar({
  initialUser,
  initialBalance,
  initialSessions,
  initialLimit,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  initialUser: SessionUser | null;
  initialBalance: number;
  initialSessions: ResearchSummary[];
  initialLimit: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { data: session, isPending } = useSession();
  // Seeded from the server so the list is complete on first paint. The
  // `useEffect` below still refetches on navigation to stay fresh.
  const [fetched, setFetched] = React.useState<ResearchSummary[] | null>(initialSessions);
  const [limit, setLimit] = React.useState<number | null>(initialLimit);
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);

  // The server already knows who this is; `useSession` only overrides it once it
  // has an answer, which is what lets a sign-out empty the sidebar.
  const user = isPending ? initialUser : (session?.user ?? null);
  const userId = user?.id ?? null;

  // One transient line under the list — the app has no toaster, and a share or
  // delete that silently does nothing is worse than a plain sentence.
  const [notice, setNotice] = React.useState<string | null>(null);
  const noticeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = React.useCallback((message: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = setTimeout(() => setNotice(null), 2500);
  }, []);

  React.useEffect(() => () => void (noticeTimer.current && clearTimeout(noticeTimer.current)), []);

  React.useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch("/api/researches")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setFetched(data.sessions);
        setLimit(data.limit ?? null);
      })
      .catch(() => {
        if (!cancelled) setFetched([]);
      });
    return () => {
      cancelled = true;
    };
    // Refetch on navigation too, so a session created via `onComplete` shows
    // up in the list without a full reload.
  }, [userId, pathname]);

  async function share(id: string) {
    try {
      const res = await fetch(`/api/research/${id}/share`, { method: "POST" });
      if (!res.ok) throw new Error("share failed");
      const { token } = await res.json();
      await navigator.clipboard.writeText(`${window.location.origin}/share/${token}`);
      flash("Share link copied");
    } catch {
      flash("Could not create a share link");
    }
  }

  async function remove(id: string) {
    setPendingDelete(id);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete;
    setPendingDelete(null);
    try {
      const res = await fetch(`/api/research/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");

      setFetched((prev) => prev?.filter((s) => s.id !== id) ?? prev);
      flash("Session deleted");

      if (pathname === `/prepare/${id}`) router.push("/prepare");
    } catch {
      flash("Could not delete that session");
    }
  }

  // Null means "still loading" — a signed-out visitor gets an empty list, not a
  // skeleton, because the server already told us there is nothing to wait for.
  const sessions = user ? fetched : [];
  const atLimit = limit != null && sessions != null && sessions.length >= limit;

  return (
    <>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader className="gap-3 p-3">
          {/*
           * Collapsed, the rail is only wide enough for one control. The brand and
           * the trigger share the same square: the trigger is stacked on top and
           * fades in on hover, so the logo is what you see at rest.
           */}
          <div className="group/header relative flex h-8 items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
            <Link
              href="/"
              className="group/brand flex items-center gap-2 overflow-hidden transition-opacity group-data-[collapsible=icon]:group-hover/header:opacity-0">
              <LogoMark glowClassName="bg-primary/30 opacity-0 group-hover/brand:opacity-100" />
              <span className="font-display truncate text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
                {siteConfig.name}
              </span>
            </Link>
            {/*
             * Collapsed centering is split by axis on purpose. Horizontally the
             * trigger is wider than the rail's content box, so auto margins lose to
             * `left` and it has to be translated. Vertically it must NOT be
             * translated: the button's `active:translate-y-px` press writes the same
             * `--tw-translate-y`, so a `-translate-y-1/2` would be dropped on
             * mousedown and the icon would jump half its height. Auto margins fit
             * there anyway, since the row is taller than the button.
             */}
            <SidebarTrigger className="text-sidebar-foreground/70 hover:text-sidebar-foreground shrink-0 transition-opacity group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:inset-y-0 group-data-[collapsible=icon]:left-1/2 group-data-[collapsible=icon]:my-auto group-data-[collapsible=icon]:-translate-x-1/2 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:group-hover/header:opacity-100" />
          </div>

          {/* Collapsed, the buttons shrink to a 2rem square; centering the items
              lines them up under the brand mark instead of the header's padding. */}
          <SidebarMenu className="group-data-[collapsible=icon]:items-center">
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="New session"
                isActive={pathname === "/prepare"}
                className={navItemActive}
                render={<Link href="/prepare" />}>
                <PlusIcon />
                {/* The menu button only truncates a span that is its *last* child, and
                    here the pending hint is. Without this the label rewraps to two
                    lines on its way out as the rail collapses. */}
                <span className="font-display truncate font-medium">New session</span>
                <NavPendingHint />
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Refer a friend and earn credits"
                render={<Link href="/referrals" />}
                className={navItemActive}
                isActive={pathname === "/referrals"}>
                <Gift className="size-4" />
                <span className="font-display font-medium">Refer & Earn</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Share your thoughts or report an issue"
                render={<Link href="/feedback" />}
                className={navItemActive}
                isActive={pathname === "/feedback"}>
                <MessageSquareIcon className="size-4" />
                <span className="font-display font-medium">Feedback</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <Separator className="bg-sidebar-border" />
        </SidebarHeader>
        <SidebarContent>
          {/* Truncated company names in a 3rem rail read as noise, not navigation. */}
          <SidebarGroup className="px-3 group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel className="font-display justify-between">
              <span>Sessions</span>
              {user && limit != null && sessions != null && (
                <span
                  className={`text-[11px] tabular-nums ${
                    atLimit ? "text-status-warning" : "text-sidebar-foreground/50"
                  }`}
                  title={`We keep your ${limit} most recent sessions. Starting a new one deletes the oldest.`}>
                  {sessions.length}/{limit}
                </span>
              )}
            </SidebarGroupLabel>
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
                    {user ? "No sessions yet" : "Sign in to save sessions"}
                  </span>
                </SidebarMenuItem>
              )}
              {sessions?.map((s) => (
                <SidebarMenuItem key={s.id}>
                  <SidebarMenuButton
                    size="lg"
                    isActive={pathname === `/prepare/${s.id}`}
                    className={navItemActive}
                    render={<Link href={`/prepare/${s.id}`} />}>
                    <div className="flex min-w-0 flex-col gap-0.5 py-1">
                      <span className="font-display truncate">{s.companyName}</span>
                      {/* Tints with the row: left grey it reads as a half-selected
                          row once the company name above it turns brand. */}
                      <span className="font-display text-sidebar-foreground/60 group-data-active/menu-button:text-primary/70 truncate text-xs">
                        {s.interviewType
                          .split(",")
                          .map((c) => categoryLabel(c))
                          .join(", ")}
                      </span>
                    </div>
                    {/* Clear of the row's absolutely-positioned action button. */}
                    <NavPendingHint className="mr-5" />
                  </SidebarMenuButton>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <SidebarMenuAction
                          showOnHover
                          aria-label={`Actions for ${s.companyName}`}
                        />
                      }>
                      <MoreHorizontalIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-40"
                      side={isMobile ? "bottom" : "right"}
                      align="start">
                      <DropdownMenuItem onClick={() => share(s.id)}>
                        <Share2Icon />
                        <span className="font-display">Share</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => remove(s.id)}>
                        <Trash2Icon />
                        <span className="font-display">Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            {notice && (
              <p className="text-sidebar-foreground/60 px-2 pt-2 text-[11px] group-data-[collapsible=icon]:hidden">
                {notice}
              </p>
            )}
            {atLimit && (
              <p className="text-sidebar-foreground/50 px-2 pt-2 text-xs leading-snug group-data-[collapsible=icon]:hidden">
                You&apos;re at the {limit}-session limit. Starting a new one deletes your oldest.
              </p>
            )}
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          {user && <NavCredits balance={initialBalance} />}
          <NavUser initialUser={initialUser} initialBalance={initialBalance} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The report will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
