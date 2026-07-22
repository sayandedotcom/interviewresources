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
    /** The hero sky, restated for Satori — the OG card sits on the same blue as
     * the top of the landing page. That's `--wash-top`'s first 630px, but the
     * browser interpolates it in oklch, which Satori can't do, so these five
     * stops are sampled from the rendered page at 0/25/50/75/100% rather than
     * derived from the `--brand-*` ramp. Re-sample if the wash changes. */
    ogSky: ["#0060b7", "#006dca", "#0079dc", "#198be9", "#3c9ef1"],
    /** OG text on that sky, mirroring the hero's white-on-blue treatment. */
    ogForeground: "#ffffff",
    ogMuted: "rgba(255, 255, 255, 0.8)",
  },
};
