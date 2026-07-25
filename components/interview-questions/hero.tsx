import { cn } from "@/lib/utils";

/**
 * The top band of a public interview-questions page.
 *
 * Marketing pages sit on the layout's `--wash-top` sky, which is a deep brand
 * blue for its first few hundred pixels — so everything in this band is styled
 * for white-on-blue. The previous version of these pages rendered
 * `text-foreground` here, which put near-black headings on brand-700.
 */
export function HeroBand({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "mx-auto w-full max-w-6xl px-6 pt-12 pb-16 md:px-8 md:pt-16 md:pb-20",
        className
      )}>
      {children}
    </section>
  );
}

export function HeroEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.22em] text-white/70 uppercase">
      {children}
    </p>
  );
}

/** A single number from the research, shown as glass on the blue sky. */
export function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-sm">
      <p className="font-display text-2xl font-semibold tracking-tight text-white tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-xs leading-snug text-white/70">{label}</p>
    </div>
  );
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return <div className="mt-10 grid gap-3 sm:grid-cols-3">{children}</div>;
}
