import Link from "next/link";

import { Coins } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Quick-glance credit balance above the profile row, hidden when the sidebar
 * is collapsed to icon-only (same pattern as the Sessions group). */
export function NavCredits({ balance }: { balance: number }) {
  return (
    <SidebarMenu className="group-data-[collapsible=icon]:hidden">
      <SidebarMenuItem className="bg-sidebar-accent/60 border-sidebar-border flex items-center justify-between gap-2 rounded-md border p-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="border-border font-display flex h-6 cursor-help items-center gap-1.5 rounded-full border px-2 text-sm font-bold" />
            }>
            <Coins className="text-primary size-4" />
            {balance}
          </TooltipTrigger>
          <TooltipContent>
            <span className="font-display">Your current credit balance</span>
          </TooltipContent>
        </Tooltip>
        <Button variant="glossy" size="sm" render={<Link href="/payments" />}>
          Buy credits
        </Button>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
