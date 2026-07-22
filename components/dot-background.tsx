import { cn } from "@/lib/utils";

/** Faded radial-dot backdrop, masked to fade out toward the edges. Wraps
 * `children` in a relatively-positioned container so page content stacks on
 * top via `z-20`. */
export function DotBackground({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "absolute inset-0",
          "[background-size:20px_20px]",
          "[background-image:radial-gradient(var(--brand-300)_1px,transparent_1px)]"
        )}
      />
      <div className="bg-background pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      <div className="relative z-20">{children}</div>
    </div>
  );
}
