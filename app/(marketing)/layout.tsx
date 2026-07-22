/**
 * Marketing pages share a blue sky bleeding down from the top of the page: a
 * deep brand blue behind the hero that fades out well below the fold, so the
 * next sections sit on a pale tint rather than a hard edge.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[78rem] [background-image:var(--wash-top)]"
      />
      {children}
    </div>
  );
}
