"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root data-slot="accordion" className={cn("w-full", className)} {...props} />
  );
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-border/70 border-b", className)}
      {...props}
    />
  );
}

function AccordionTrigger({ className, children, ...props }: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header data-slot="accordion-header" className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "font-display group/accordion focus-visible:ring-ring/50 flex flex-1 cursor-pointer items-center justify-between gap-6 py-6 text-left text-lg font-semibold tracking-tight outline-none focus-visible:ring-3 sm:text-xl",
          className
        )}
        {...props}>
        {children}
        <ChevronDown
          aria-hidden
          className="text-muted-foreground ease-out-strong size-5 shrink-0 transition-transform duration-200 group-data-panel-open/accordion:rotate-180"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionPanel({ className, children, ...props }: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-panel"
      className="ease-out-strong h-[var(--accordion-panel-height)] overflow-hidden transition-[height] duration-200 data-ending-style:h-0 data-starting-style:h-0"
      {...props}>
      <div
        className={cn("text-muted-foreground max-w-2xl pb-7 text-base leading-relaxed", className)}>
        {children}
      </div>
    </AccordionPrimitive.Panel>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionPanel };
