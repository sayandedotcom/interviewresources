/**
 * Raw color values for contexts that can't consume Tailwind classes or CSS
 * variables — `next/og` and `app/icon.tsx`/`app/apple-icon.tsx` render through
 * Satori, which needs inline styles. Everywhere else, use the `bg-primary` /
 * `text-primary` theme tokens from globals.css instead.
 */
export const brandConfig = {
  colors: {
    /** Page/manifest background — white, matches the light theme. */
    background: "#ffffff",
    /** The logo tile: a solid blue rounded square that the mark sits inside.
     * Backs the favicon, the apple-icon, and the web `LogoMark`. */
    tile: "#2f7ff0",
    /** Everything drawn inside the tile — ring, crosshairs, blip. */
    tileForeground: "#ffffff",
    /** OG/Twitter card background — sRGB of `--brand-100`, oklch(0.952 0.026 241). */
    ogBackground: "#e4edfb",
    ogForeground: "#0b1220",
    ogMuted: "#4a5d7a",
  },
};
