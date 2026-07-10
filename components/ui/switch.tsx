"use client";

import * as React from "react";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";

import { cn } from "@/lib/utils";

function Switch({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer data-[checked=true]:bg-primary data-[checked=true]:border-primary border-input focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 h-5 w-9 cursor-pointer rounded-full border-2 border-transparent bg-transparent p-0.5 transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3",
        className
      )}
      {...props}>
      <CheckboxPrimitive.Indicator className="relative flex h-full w-full items-center justify-center">
        <div className="bg-background h-4 w-4 rounded-full shadow-sm ring-1 ring-black/10 ring-inset dark:ring-white/10" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Switch };
