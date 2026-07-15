import { siteConfig } from "@/site";
import { Check, X } from "lucide-react";

export function WhyNotChatgptSection() {
  const { vsChatgpt } = siteConfig.copy;

  return (
    <section className="mx-auto w-full max-w-3xl border-t px-5 py-12">
      <div className="mb-8 text-center">
        <p className="text-tertiary mb-3 font-mono text-xs font-semibold tracking-[0.25em] uppercase">
          {vsChatgpt.eyebrow}
        </p>
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {vsChatgpt.title}
        </h2>
        <p className="font-display text-muted-foreground mx-auto mt-2 max-w-xl">{vsChatgpt.sub}</p>
      </div>

      <div className="overflow-hidden rounded-xl border">
        {/* Column headers */}
        <div className="bg-muted/50 grid grid-cols-2 border-b sm:grid-cols-[1.2fr_1fr_1fr]">
          <span className="font-display hidden p-4 text-sm font-semibold sm:block">Difference</span>
          <span className="font-display text-muted-foreground p-4 text-center text-sm font-semibold">
            {vsChatgpt.chatgptLabel}
          </span>
          <span className="font-display text-tertiary p-4 text-center text-sm font-semibold">
            {vsChatgpt.usLabel}
          </span>
        </div>

        {vsChatgpt.rows.map((row) => (
          <div
            key={row.point}
            className="grid grid-cols-2 border-b last:border-0 sm:grid-cols-[1.2fr_1fr_1fr]">
            <p className="font-display text-muted-foreground col-span-2 px-4 pt-4 text-xs font-semibold tracking-wide uppercase sm:col-span-1 sm:pt-4 sm:text-sm sm:normal-case">
              {row.point}
            </p>
            <div className="flex items-start gap-2 p-4">
              <X className="text-muted-foreground/60 mt-0.5 h-4 w-4 shrink-0" />
              <span className="font-display text-muted-foreground text-sm">{row.chatgpt}</span>
            </div>
            <div className="flex items-start gap-2 p-4">
              <Check className="text-tertiary mt-0.5 h-4 w-4 shrink-0" />
              <span className="font-display text-sm">{row.us}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
