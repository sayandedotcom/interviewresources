import { siteConfig } from "@/site";
import { Ban, Check, FileText, Lock, Search, ShieldAlert } from "lucide-react";

/**
 * A soft tinted cradle holding a floating white mock-UI panel. Each beat gets
 * its own accent so the section reads as three distinct ideas rather than one
 * flat blue wall; the tint classes are passed in whole because Tailwind can't
 * see dynamically-built class names.
 */
function Cradle({ tint, children }: { tint: string; children: React.ReactNode }) {
  return (
    <div
      className={`silver-edge rounded-3xl bg-gradient-to-b p-5 shadow-[var(--shadow-sm)] sm:p-6 ${tint}`}>
      <div className="border-border/50 bg-background rounded-2xl border p-4 shadow-[var(--shadow-md)]">
        {children}
      </div>
    </div>
  );
}

/** The Cluely caption treatment: bold lead clause, muted body, both inline. */
function Caption({ name, body }: { name: string; body: string }) {
  return (
    <p className="font-display mt-6 text-lg leading-relaxed">
      <span className="text-foreground font-semibold">{name}.</span>{" "}
      <span className="text-muted-foreground">{body}</span>
    </p>
  );
}

/** 01 — the search mock: what the agent queries, and the one place it won't. */
function SourceSearchMock({ chips }: { chips: readonly string[] }) {
  return (
    <>
      <div className="border-border/60 bg-muted/40 flex items-center gap-2 rounded-lg border px-3 py-2">
        <Search className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
        <span className="text-xs text-violet-700">stripe backend interview experience</span>
      </div>
      <div className="mt-3 space-y-1.5">
        {chips.map((chip) => (
          <div key={chip} className="flex items-center gap-2.5">
            <Check className="h-3.5 w-3.5 shrink-0 text-violet-500" />
            <span className="font-display text-foreground/80 text-sm">{chip}</span>
          </div>
        ))}
        {/* <div className="border-border/60 mt-2 flex items-center gap-2.5 border-t pt-2.5">
          <Ban className="text-muted-foreground/60 h-3.5 w-3.5 shrink-0" />
          <span className="font-display text-muted-foreground/60 text-sm line-through">
            LinkedIn
          </span>
          <span className="ml-auto rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
            Never
          </span>
        </div> */}
      </div>
    </>
  );
}

/** 02 — the evidence gate: the thresholds a run has to clear to ship. */
function EvidenceGateMock() {
  const gates = [
    { value: "3", unit: "min", label: "Substantial sources", met: true },
    { value: "5", unit: "or", label: "Sources with a full page pulled", met: true },
    { value: "0", unit: "count", label: "Company overviews and bio pages", met: false },
  ];
  return (
    <>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
          <FileText className="h-6 w-6 text-emerald-600" strokeWidth={1.75} />
        </span>
        <span className="font-display text-base font-semibold">Evidence check</span>
        <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          Rich
        </span>
      </div>
      <div className="divide-border/60 mt-1 divide-y">
        {gates.map((g) => (
          <div key={g.label} className="flex items-baseline gap-4 py-3">
            <span className="font-display w-14 shrink-0 text-3xl font-semibold tracking-tight tabular-nums">
              {g.value}
              <span className="text-muted-foreground ml-0.5 text-xs font-normal">{g.unit}</span>
            </span>
            <span
              className={`font-display text-sm leading-snug ${
                g.met ? "text-foreground/80" : "text-muted-foreground/60 line-through"
              }`}>
              {g.label}
            </span>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground border-border/60 mt-1 border-t pt-3 text-[10px]">
        below threshold → broaden, don&apos;t ship
      </p>
    </>
  );
}

/** Accent per rule card, so the two guarantees read as separate promises. */
const RULE_STYLES = [
  {
    tint: "from-amber-100/80 to-amber-50/30",
    icon: "text-amber-600",
    chip: "bg-amber-50 text-amber-700",
    Icon: ShieldAlert,
    tag: "Forced Low",
  },
  {
    tint: "from-rose-100/80 to-rose-50/30",
    icon: "text-rose-600",
    chip: "bg-rose-50 text-rose-700",
    Icon: Lock,
    tag: "Capped Medium",
  },
];

/**
 * The sourcing story: what the agent searches, how it measures what came back,
 * and the two confidence rules enforced in code rather than left to the model.
 * Static content, so this stays a server component.
 */
export function HowWeSourceSection() {
  const { sourcing } = siteConfig.copy;
  const [hunt, count] = sourcing.beats;

  return (
    <section id="how-we-source" className="mx-auto w-full max-w-6xl px-6 py-24 md:px-8">
      <div className="mb-14 text-center">
        <p className="text-tertiary mb-3 text-xs font-semibold tracking-[0.25em] uppercase">
          {sourcing.eyebrow}
        </p>
        <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {sourcing.title}
        </h2>
        <p className="font-display text-muted-foreground mx-auto mt-4 max-w-2xl text-lg leading-relaxed">
          {sourcing.sub}
        </p>
      </div>

      {/* Two beats, each a tinted cradle with its caption below. */}
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <Cradle tint="from-violet-200/70 to-violet-50/40">
            <SourceSearchMock chips={hunt.chips ?? []} />
          </Cradle>
          <Caption name={hunt.name} body={hunt.body} />
          {hunt.note && (
            <p className="font-display text-muted-foreground-subtle mt-3 text-sm italic">
              {hunt.note}
            </p>
          )}
        </div>

        <div>
          <Cradle tint="from-emerald-200/70 to-emerald-50/40">
            <EvidenceGateMock />
          </Cradle>
          <Caption name={count.name} body={count.body} />
        </div>
      </div>

      {/* The two hard rules, each with its own accent. */}
      <div className="mt-20">
        <div className="mb-8 text-center">
          <h3 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {sourcing.rules.label}
          </h3>
          <p className="font-display text-muted-foreground mx-auto mt-3 max-w-xl text-base leading-relaxed">
            {sourcing.rules.sub}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {sourcing.rules.items.map((item, i) => {
            const accent = RULE_STYLES[i];
            return (
              <div
                key={item.rule}
                className={`silver-edge rounded-3xl bg-gradient-to-b p-6 shadow-[var(--shadow-sm)] ${accent.tint} sm:p-8`}>
                <div className="flex items-center gap-3">
                  <accent.Icon className={`h-5 w-5 shrink-0 ${accent.icon}`} />
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${accent.chip}`}>
                    {accent.tag}
                  </span>
                </div>
                <p className="font-display mt-4 text-xl font-semibold tracking-tight">
                  {item.rule}
                </p>
                <p className="font-display text-muted-foreground mt-2 text-base leading-relaxed">
                  {item.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
