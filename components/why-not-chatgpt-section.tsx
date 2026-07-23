import { siteConfig } from "@/site";
import { Check, X } from "lucide-react";

/** The winning column runs as a continuous tinted band down the table, so the
 * comparison reads as a side taken rather than three neutral columns. */
const usCell = "bg-brand-50/70";

export function WhyNotChatgptSection() {
  const { vsChatgpt } = siteConfig.copy;

  return (
    <section className="bg-brand-50/40 w-full">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 md:px-8">
        <div className="mb-12 text-center">
          <p className="text-tertiary mb-3 text-xs font-semibold tracking-[0.25em] uppercase">
            {vsChatgpt.eyebrow}
          </p>
          <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {vsChatgpt.title}
          </h2>
          <p className="font-display text-muted-foreground mx-auto mt-4 max-w-2xl text-lg leading-relaxed">
            {vsChatgpt.sub}
          </p>
        </div>

        <div className="silver-edge bg-card overflow-hidden rounded-3xl shadow-[var(--shadow-md)]">
          {/* Column headers */}
          <div className="border-border/60 grid grid-cols-2 border-b sm:grid-cols-[1.2fr_1fr_1fr]">
            <span className="font-display text-muted-foreground hidden p-5 text-sm font-semibold tracking-wide uppercase sm:block">
              Difference
            </span>
            <span className="font-display text-muted-foreground p-5 text-center text-base font-semibold">
              {vsChatgpt.chatgptLabel}
            </span>
            <span
              className={`font-display text-tertiary p-5 text-center text-base font-semibold ${usCell}`}>
              {vsChatgpt.usLabel}
            </span>
          </div>

          <div className="divide-border/60 divide-y">
            {vsChatgpt.rows.map((row) => (
              <div key={row.point} className="grid grid-cols-2 sm:grid-cols-[1.2fr_1fr_1fr]">
                <p className="font-display text-foreground col-span-2 px-5 pt-5 text-xs font-semibold tracking-wide uppercase sm:col-span-1 sm:self-center sm:py-5 sm:text-base sm:normal-case">
                  {row.point}
                </p>
                <div className="flex items-start gap-2.5 p-5">
                  <span className="bg-muted mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                    <X className="text-muted-foreground-subtle h-3 w-3" strokeWidth={2.5} />
                  </span>
                  <span className="font-display text-muted-foreground text-base">
                    {row.chatgpt}
                  </span>
                </div>
                <div className={`flex items-start gap-2.5 p-5 ${usCell}`}>
                  <span className="bg-tertiary/15 mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                    <Check className="text-tertiary h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="font-display text-foreground text-base font-medium">
                    {row.us}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
