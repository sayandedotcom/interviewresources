import { siteConfig } from "@/site";
import { Lock, Radar, Scale } from "lucide-react";

/** Icons for the two beats, in the order they appear in the copy config. */
const BEAT_ICONS = [Radar, Scale];

/**
 * The sourcing story: what the agent searches, how it measures what came back,
 * and the two confidence rules enforced in code rather than left to the model.
 * Static content, so this stays a server component.
 */
export function HowWeSourceSection() {
  const { sourcing } = siteConfig.copy;

  return (
    <section id="how-we-source" className="mx-auto w-full max-w-3xl border-t px-5 py-12">
      <div className="mb-8 text-center">
        <p className="text-tertiary mb-3 font-mono text-xs font-semibold tracking-[0.25em] uppercase">
          {sourcing.eyebrow}
        </p>
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {sourcing.title}
        </h2>
        <p className="font-display text-muted-foreground mx-auto mt-2 max-w-xl">{sourcing.sub}</p>
      </div>

      <div className="space-y-4">
        {sourcing.beats.map((beat, i) => {
          const Icon = BEAT_ICONS[i];
          return (
            <div key={beat.name} className="bg-card rounded-xl border p-5">
              <div className="flex items-center gap-3">
                <div className="bg-tertiary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                  <Icon className="text-tertiary h-4 w-4" />
                </div>
                <h3 className="font-display text-base font-semibold">{beat.name}</h3>
              </div>
              <p className="font-display text-muted-foreground mt-3 text-sm leading-relaxed">
                {beat.body}
              </p>

              {beat.chips && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {beat.chips.map((chip) => (
                    <span
                      key={chip}
                      className="border-border bg-background text-muted-foreground flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px]">
                      <span className="bg-tertiary inline-block h-1.5 w-1.5 rounded-full" />
                      {chip}
                    </span>
                  ))}
                </div>
              )}

              {beat.note && (
                <p className="font-display text-muted-foreground/70 mt-3 text-xs italic">
                  {beat.note}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-status-warning/30 bg-status-warning/5 mt-4 rounded-xl border p-5">
        <div className="flex items-center gap-2">
          <Lock className="text-status-warning h-4 w-4" />
          <p className="font-display text-sm font-semibold">{sourcing.rules.label}</p>
        </div>
        <p className="font-display text-muted-foreground mt-2 text-xs">{sourcing.rules.sub}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {sourcing.rules.items.map((item) => (
            <div key={item.rule} className="border-border bg-background rounded-lg border p-4">
              <p className="font-display text-sm font-semibold">{item.rule}</p>
              <p className="font-display text-muted-foreground mt-2 text-sm leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
