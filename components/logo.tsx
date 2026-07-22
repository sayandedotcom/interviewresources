const sizeClasses = {
  sm: "size-5",
  md: "size-6",
  lg: "size-7",
  xl: "size-9",
} as const;

const variantClasses = {
  solid: "bg-primary text-white",
  inverted: "bg-white text-primary",
} as const;

interface LogoMarkProps {
  size?: keyof typeof sizeClasses;
  /** `solid` (blue tile, white mark) everywhere except the blue hero, where
   * `inverted` (white tile, blue mark) keeps the tile from disappearing. */
  variant?: keyof typeof variantClasses;
  /** Full class string for the glow span (color/opacity/hover-reveal). Omit for no glow. */
  glowClassName?: string;
  className?: string;
}

/**
 * The brand mark: a solid rounded-square tile with the radar scope — ring,
 * faint crosshairs, and a dot blip in the upper-right quadrant — drawn inside
 * it in a single flat color. Wrap in a `group`/`group/name` for hover glow.
 */
export function LogoMark({
  size = "md",
  variant = "solid",
  glowClassName,
  className,
}: LogoMarkProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-[28%] ${sizeClasses[size]} ${variantClasses[variant]} ${className ?? ""}`}>
      {glowClassName && (
        <span
          className={`absolute inset-0 rounded-[28%] blur-md transition-opacity ${glowClassName}`}
        />
      )}
      <svg viewBox="0 0 24 24" aria-hidden="true" className="relative size-[72%]">
        <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
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
        <circle cx="16" cy="8" r="2.5" fill="currentColor" />
      </svg>
    </span>
  );
}
