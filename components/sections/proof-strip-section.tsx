import { Section } from "@/components/sections/section";

const PROOF_ITEMS = [
  { value: "<$0.50", label: "typical report" },
  { value: "~3 minutes", label: "typical runtime" },
  { value: "Evidence links", label: "on every question" },
];

export function ProofStripSection() {
  return (
    <Section tone="tint" innerClassName="py-10 md:py-12">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {PROOF_ITEMS.map((item) => (
          <div
            key={item.label}
            className="silver-edge bg-card flex min-h-24 items-center justify-between gap-4 rounded-2xl px-5 py-4 shadow-[var(--shadow-sm)]">
            <p className="font-display text-2xl font-semibold tracking-tight">{item.value}</p>
            <p className="text-muted-foreground text-right text-xs tracking-[0.2em] uppercase">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}
