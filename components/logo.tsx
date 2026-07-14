const sizeClasses = {
  sm: "size-3.5",
  md: "size-4.5",
  lg: "size-6",
} as const;

interface LogoMarkProps {
  size?: keyof typeof sizeClasses;
  /** Full class string for the glow span (color/opacity/hover-reveal). Omit for no glow. */
  glowClassName?: string;
  className?: string;
}

/**
 * The radar-scope brand mark: a muted ring with faint crosshairs and a lime
 * dot blip in the upper-right quadrant. Wrap in a `group`/`group/name` for hover glow.
 */
export function LogoMark({ size = "md", glowClassName, className }: LogoMarkProps) {
  return (
    <span
      className={`text-muted-foreground relative inline-block shrink-0 ${sizeClasses[size]} ${className ?? ""}`}>
      {glowClassName && (
        <span
          className={`absolute inset-0 rounded-full blur-md transition-opacity ${glowClassName}`}
        />
      )}
      <svg viewBox="0 0 24 24" aria-hidden="true" className="relative size-full">
        <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <line
          x1="12"
          y1="2.25"
          x2="12"
          y2="21.75"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.4"
        />
        <line
          x1="2.25"
          y1="12"
          x2="21.75"
          y2="12"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.4"
        />
        <circle cx="16" cy="8" r="2.5" className="fill-tertiary" />
      </svg>
    </span>
  );
}
