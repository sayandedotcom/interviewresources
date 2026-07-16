import { siteConfig } from "@/site";

export function FounderNoteSection() {
  const { founderNote } = siteConfig.copy;

  return (
    <section className="mx-auto w-full max-w-2xl border-t px-5 py-16">
      <p className="text-tertiary mb-4 text-center font-mono text-xs font-semibold tracking-[0.25em] uppercase">
        {founderNote.eyebrow}
      </p>
      <div className="space-y-4">
        {founderNote.paragraphs.map((p, i) => (
          <p key={i} className="font-display text-muted-foreground text-[15px] leading-relaxed">
            {p}
          </p>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-3">
        <div className="bg-tertiary/10 text-tertiary font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
          {founderNote.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <div>
          <a
            href={siteConfig.links.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="font-display hover:text-tertiary text-sm font-semibold transition-colors">
            {founderNote.name}
          </a>
          <p className="text-muted-foreground font-display text-xs">{founderNote.role}</p>
        </div>
      </div>
    </section>
  );
}
