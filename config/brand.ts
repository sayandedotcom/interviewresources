/**
 * Raw color values for contexts that can't consume Tailwind classes or CSS
 * variables — `next/og` and `app/icon.tsx`/`app/apple-icon.tsx` render through
 * Satori, which needs inline styles. Everywhere else, use the `bg-primary` /
 * `text-tertiary` theme tokens from globals.css instead.
 */
export const brandConfig = {
  colors: {
    background: "#171717",
    mark: "#eaeaea",
    ogForeground: "#fafafa",
    ogMuted: "#a1a1a1",
  },
};
