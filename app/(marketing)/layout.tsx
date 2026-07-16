/**
 * Marketing pages share a textured backdrop: the same faded dot grid the app
 * pages use, plus a soft tertiary glow bleeding from behind the hero so the
 * top of the page has color and depth instead of uniform flat black.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 flex-col">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Dot grid, faded toward the edges (same treatment as /prepare). */}
        <div className="absolute inset-0 [background-image:radial-gradient(#d4d4d4_1px,transparent_1px)] [background-size:20px_20px] dark:[background-image:radial-gradient(#303030_1px,transparent_1px)]" />
        <div className="absolute inset-0 bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] dark:bg-black" />
        {/* Tertiary glow behind the hero. */}
        <div className="bg-tertiary/10 dark:bg-tertiary/15 absolute -top-40 left-1/2 h-[36rem] w-[56rem] -translate-x-1/2 rounded-full blur-3xl" />
      </div>
      {children}
    </div>
  );
}
