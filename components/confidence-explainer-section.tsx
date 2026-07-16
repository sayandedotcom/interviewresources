import { siteConfig } from "@/site";

const LEVEL_TONE: Record<string, string> = {
  High: "text-status-good border-status-good/30 bg-status-good/10",
  Medium: "text-status-warning border-status-warning/30 bg-status-warning/10",
  Low: "text-muted-foreground border-border bg-muted/40",
};

export function ConfidenceExplainerSection() {
  const { confidence } = siteConfig.copy;

  return (
    <section className="mx-auto w-full max-w-3xl border-t px-5 py-12">
      <div className="mb-8 text-center">
        <p className="text-tertiary mb-3 font-mono text-xs font-semibold tracking-[0.25em] uppercase">
          {confidence.eyebrow}
        </p>
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {confidence.title}
        </h2>
        <p className="font-display text-muted-foreground mx-auto mt-2 max-w-xl">{confidence.sub}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {confidence.levels.map((level) => {
          const tone = LEVEL_TONE[level.label];
          return (
            <div key={level.label} className="bg-card rounded-xl border p-5">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide uppercase ${tone}`}>
                  {level.label}
                </span>
                <span className="text-tertiary font-mono text-sm tracking-widest">
                  {level.signal}
                </span>
              </div>
              <p className="font-display text-muted-foreground mt-3 text-sm">{level.body}</p>
              <div className="border-border bg-background mt-4 rounded-lg border p-3">
                <p className="font-display text-xs italic">&ldquo;{level.sample}&rdquo;</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-status-warning/30 bg-status-warning/5 mt-4 rounded-xl border p-5">
        <div className="flex items-center gap-2">
          <span className="text-status-warning border-status-warning/30 bg-status-warning/10 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide uppercase">
            {confidence.inferred.label}
          </span>
        </div>
        <p className="font-display text-muted-foreground mt-3 text-sm leading-relaxed">
          {confidence.inferred.body}
        </p>
      </div>
    </section>
  );
}
