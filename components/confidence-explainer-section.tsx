import { siteConfig } from "@/site";
import { CircleDashed, Link2, Sparkles } from "lucide-react";

/**
 * Per-level presentation. Each confidence level gets its own accent so the three
 * cards read as a scale rather than three identical boxes; Tailwind can't see
 * dynamically-built class names, so every tint is written out whole.
 */
const LEVEL_META: Record<
  string,
  { cradle: string; badge: string; bar: string; track: string; filled: number; evidence: string }
> = {
  High: {
    cradle: "from-emerald-200/70 to-emerald-50/40",
    badge: "bg-emerald-100 text-emerald-700",
    bar: "bg-emerald-500",
    track: "bg-emerald-500/15",
    filled: 3,
    evidence: "Multiple sources agree",
  },
  Medium: {
    cradle: "from-amber-200/70 to-amber-50/40",
    badge: "bg-amber-100 text-amber-700",
    bar: "bg-amber-500",
    track: "bg-amber-500/15",
    filled: 2,
    evidence: "Fewer or weaker sources",
  },
  Low: {
    cradle: "from-slate-200/70 to-slate-50/40",
    badge: "bg-slate-200 text-slate-600",
    bar: "bg-slate-400",
    track: "bg-slate-400/20",
    filled: 1,
    evidence: "Little direct evidence",
  },
};

/** The dotted signal from the copy, drawn as a three-segment meter. */
function SignalMeter({ filled, bar, track }: { filled: number; bar: string; track: string }) {
  return (
    <span className="flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className={`h-1.5 w-5 rounded-full ${i < filled ? bar : track}`} />
      ))}
    </span>
  );
}

export function ConfidenceExplainerSection() {
  const { confidence } = siteConfig.copy;

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-24 md:px-8">
      <div className="mb-14 text-center">
        <p className="text-tertiary mb-3 text-xs font-semibold tracking-[0.25em] uppercase">
          {confidence.eyebrow}
        </p>
        <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {confidence.title}
        </h2>
        <p className="font-display text-muted-foreground mx-auto mt-4 max-w-2xl text-lg leading-relaxed">
          {confidence.sub}
        </p>
      </div>

      <div className="grid gap-10 md:grid-cols-3">
        {confidence.levels.map((level) => {
          const meta = LEVEL_META[level.label];
          return (
            <div key={level.label}>
              {/* The cradle holds the question exactly as it appears in a report. */}
              <div
                className={`silver-edge rounded-3xl bg-gradient-to-b p-5 shadow-[var(--shadow-sm)] sm:p-6 ${meta.cradle}`}>
                <div className="border-border/50 bg-background rounded-2xl border p-4 shadow-[var(--shadow-md)]">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.badge}`}>
                      {level.label}
                    </span>
                    <SignalMeter filled={meta.filled} bar={meta.bar} track={meta.track} />
                  </div>
                  <p className="font-display mt-4 text-base leading-snug font-semibold">
                    {level.sample}
                  </p>
                  <div className="border-border/60 text-muted-foreground mt-4 flex items-center gap-1.5 border-t pt-3 text-xs">
                    {meta.filled > 1 ? (
                      <Link2 className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <CircleDashed className="h-3.5 w-3.5 shrink-0" />
                    )}
                    {meta.evidence}
                  </div>
                </div>
              </div>

              <p className="font-display mt-6 text-lg leading-relaxed">
                <span className="text-foreground font-semibold">{level.label} confidence.</span>{" "}
                <span className="text-muted-foreground">{level.body}</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* The Inferred tag is orthogonal to the scale, so it gets its own band. */}
      <div className="silver-edge mt-16 rounded-3xl bg-gradient-to-b from-indigo-100/80 to-indigo-50/30 p-6 shadow-[var(--shadow-sm)] sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-100">
            <Sparkles className="h-7 w-7 text-indigo-600" strokeWidth={1.75} />
          </span>
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                {confidence.inferred.label}
              </span>
              <span className="text-muted-foreground text-xs">never reaches High</span>
            </div>
            <p className="font-display text-muted-foreground mt-3 max-w-3xl text-base leading-relaxed">
              {confidence.inferred.body}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
