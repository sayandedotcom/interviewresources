import { cn } from "@/lib/utils";

const toneClasses = {
  plain: "",
  wash: "[background-image:var(--wash-band)]",
  tint: "bg-brand-50/40",
} as const;

const widthClasses = {
  wide: "max-w-6xl",
  prose: "max-w-3xl",
} as const;

/** Full-bleed section band. Bands are separated by surface color and shadow
 * instead of hairline borders — see the makeover plan for the rationale. */
export function Section({
  id,
  tone = "plain",
  width = "wide",
  className,
  innerClassName,
  children,
}: {
  id?: string;
  tone?: keyof typeof toneClasses;
  width?: keyof typeof widthClasses;
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("w-full", toneClasses[tone], className)}>
      <div
        className={cn(
          "mx-auto w-full px-6 py-24 md:px-8 md:py-32",
          widthClasses[width],
          innerClassName
        )}>
        {children}
      </div>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  sub,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div className={cn("mb-12", align === "center" ? "text-center" : "text-left", className)}>
      {eyebrow && (
        <p className="text-tertiary mb-3 text-xs font-semibold tracking-[0.25em] uppercase">
          {eyebrow}
        </p>
      )}
      <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h2>
      {sub && (
        <p className="font-display text-muted-foreground mx-auto mt-4 max-w-2xl text-lg leading-relaxed">
          {sub}
        </p>
      )}
    </div>
  );
}
