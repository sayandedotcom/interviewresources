import { SampleReportPanel } from "@/components/how-it-works-section";

/**
 * The hero's floating product-UI card. Reuses the sample report mock built
 * for the how-it-works sticky-scroll (browser chrome, question cards,
 * confidence badges) instead of inventing new mock UI.
 */
export function HeroProductCard() {
  return (
    <div className="relative mx-auto -mt-4 w-full max-w-5xl md:-mt-8">
      <div className="silver-edge bg-card h-[520px] overflow-hidden rounded-3xl shadow-[var(--shadow-float)] md:h-[600px]">
        <SampleReportPanel />
      </div>
      <div className="from-background pointer-events-none absolute inset-x-0 -bottom-1 h-24 bg-gradient-to-t to-transparent" />
    </div>
  );
}
