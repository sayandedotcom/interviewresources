import { siteConfig } from "@/site";
import { Check } from "lucide-react";

import { Section } from "@/components/sections/section";

/** Our column is a continuous tinted band; the alternatives stay neutral. */
const usCell = "bg-brand-50/70";

/** A cell value that may be a boolean tick or a short string. `mine` renders the
 * affirmative in brand colour; the alternatives stay muted so the eye lands on
 * one column rather than scanning all three equally. */
function Cell({ value, mine = false }: { value: boolean | string; mine?: boolean }) {
  if (typeof value !== "boolean") {
    return (
      <span
        className={`font-display text-base ${mine ? "text-primary font-semibold" : "text-muted-foreground"}`}>
        {value}
      </span>
    );
  }
  if (!value) return <span className="text-muted-foreground/50 text-base">—</span>;
  return (
    <span
      className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full ${
        mine ? "bg-primary/15" : "bg-muted"
      }`}>
      <Check
        className={`h-3.5 w-3.5 ${mine ? "text-primary" : "text-muted-foreground-subtle"}`}
        strokeWidth={3}
      />
    </span>
  );
}

export function ComparisonSection() {
  const { landing } = siteConfig.copy;

  return (
    <Section tone="tint">
      <div className="mb-12 text-center">
        <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Why {siteConfig.name}?
        </h2>
        <p className="font-display text-muted-foreground mx-auto mt-4 max-w-2xl text-lg leading-relaxed">
          {landing.comparison.sub}
        </p>
      </div>

      <div className="silver-edge bg-card overflow-hidden rounded-3xl shadow-[var(--shadow-md)]">
        {/* Narrow viewports scroll the table rather than crushing four columns. */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem]">
            <thead>
              <tr className="border-border/60 border-b">
                <th className="font-display text-muted-foreground p-5 text-left text-sm font-semibold tracking-wide uppercase">
                  Feature
                </th>
                <th
                  className={`font-display text-primary p-5 text-center text-base font-semibold ${usCell}`}>
                  {siteConfig.name}
                </th>
                <th className="font-display text-muted-foreground p-5 text-center text-base font-semibold">
                  Generic Prep
                </th>
                <th className="font-display text-muted-foreground p-5 text-center text-base font-semibold">
                  Coaching
                </th>
              </tr>
            </thead>
            <tbody className="divide-border/60 divide-y">
              {siteConfig.comparison.map((row, i) => (
                <tr key={i} className="hover:bg-muted/20 transition-colors">
                  <td className="font-display p-5 text-base font-medium">{row.feature}</td>
                  <td className={`p-5 text-center ${usCell}`}>
                    <Cell value={row.us} mine />
                  </td>
                  <td className="p-5 text-center">
                    <Cell value={row.genericPrep} />
                  </td>
                  <td className="p-5 text-center">
                    <Cell value={row.coaching} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Section>
  );
}
