const sizeClasses = {
  sm: "size-2.5",
  md: "size-3",
} as const;

interface LogoMarkProps {
  size?: keyof typeof sizeClasses;
  /** Full class string for the glow span (color/opacity/hover-reveal). Omit for no glow. */
  glowClassName?: string;
  className?: string;
}

/** The rotated-square brand mark. Wrap in a `group`/`group/name` for hover glow. */
export function LogoMark({ size = "md", glowClassName, className }: LogoMarkProps) {
  return (
    <span
      className={`bg-primary relative inline-block shrink-0 rotate-45 ${sizeClasses[size]} ${className ?? ""}`}>
      {glowClassName && (
        <span
          className={`absolute inset-0 rounded-sm blur-md transition-opacity ${glowClassName}`}
        />
      )}
    </span>
  );
}
