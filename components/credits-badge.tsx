"use client";

import { Coins } from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface CreditsBadgeProps {
  balance: number | null;
  className?: string;
}

export function CreditsBadge({ balance, className }: CreditsBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={`gap-1 font-mono text-[10px] tracking-widest ${className}`}>
      <Coins className="text-tertiary size-3" />
      {balance === null ? "—" : balance}
    </Badge>
  );
}
