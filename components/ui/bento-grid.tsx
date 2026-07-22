import { type ComponentPropsWithoutRef, type ReactNode } from "react";

import { ArrowRightIcon } from "@radix-ui/react-icons";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string;
  className: string;
  background: ReactNode;
  Icon: React.ElementType;
  description: string;
  /** Optional hover CTA. The link only renders when both href and cta are set. */
  href?: string;
  cta?: string;
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div className={cn("grid w-full auto-rows-[22rem] grid-cols-3 gap-4", className)} {...props}>
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  ...props
}: BentoCardProps) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-3 flex flex-col justify-between overflow-hidden",
      "card-surface transform-gpu",
      className
    )}
    {...props}>
    <div>{background}</div>
    <div className="p-6">
      <div
        className={cn(
          "pointer-events-none z-10 flex transform-gpu flex-col gap-1.5 transition-all duration-300",
          href && cta && "lg:group-hover:-translate-y-10"
        )}>
        <Icon className="text-tertiary h-7 w-7 origin-left transform-gpu transition-all duration-300 ease-in-out group-hover:scale-75" />
        <h3 className="font-display text-foreground text-xl font-semibold tracking-tight">
          {name}
        </h3>
        <p className="font-display text-muted-foreground max-w-lg text-base leading-relaxed">
          {description}
        </p>
      </div>

      {href && cta && (
        <div
          className={cn(
            "pointer-events-none flex w-full translate-y-0 transform-gpu flex-row items-center transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:hidden"
          )}>
          <Button
            variant="link"
            size="sm"
            className="pointer-events-auto p-0"
            render={<a href={href} />}
            nativeButton={false}>
            {cta}
            <ArrowRightIcon className="ms-2 h-4 w-4 rtl:rotate-180" />
          </Button>
        </div>
      )}
    </div>

    {href && cta && (
      <div
        className={cn(
          "pointer-events-none absolute bottom-0 hidden w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:flex"
        )}>
        <Button
          variant="link"
          size="sm"
          className="pointer-events-auto p-0"
          render={<a href={href} />}
          nativeButton={false}>
          {cta}
          <ArrowRightIcon className="ms-2 h-4 w-4 rtl:rotate-180" />
        </Button>
      </div>
    )}

    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/3" />
  </div>
);

export { BentoCard, BentoGrid };
