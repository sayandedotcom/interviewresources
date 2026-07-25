import Image from "next/image";

import { siteConfig } from "@/site";

export function FounderNoteSection() {
  const { founderNote } = siteConfig.copy;
  const initials = founderNote.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  // overflow-x-clip, not hidden: the rotated card and its offset sheet stick out
  // past the wrapper at mid widths. Clipping only the x axis keeps the vertical
  // shadow intact.
  return (
    <section className="w-full overflow-x-clip px-6 py-20 md:px-8">
      <div className="relative mx-auto w-full max-w-2xl">
        {/* A second sheet peeking out behind, so the memo reads as paper on a
            desk rather than a flat panel. Purely decorative. */}
        <div
          aria-hidden
          className="bg-muted/70 absolute inset-0 translate-x-2 translate-y-2 -rotate-2 rounded-3xl"
        />

        <div className="silver-edge bg-card relative -rotate-[0.6deg] rounded-3xl p-8 shadow-[var(--shadow-xl)] sm:p-12">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            {founderNote.eyebrow}
          </h2>

          <div className="mt-6 space-y-5">
            {founderNote.paragraphs.map((p, i) => (
              <p key={i} className="font-display text-muted-foreground text-lg leading-relaxed">
                {p}
              </p>
            ))}
          </div>

          {/* Sign-off: signature on the left, attribution on the right. */}
          <div className="border-border/60 mt-10 flex flex-wrap items-end justify-between gap-6 border-t pt-8">
            {founderNote.signatureSrc ? (
              <Image
                src={founderNote.signatureSrc}
                alt={`${founderNote.name}'s signature`}
                width={180}
                height={64}
                className="h-14 w-auto opacity-80 mix-blend-multiply"
              />
            ) : (
              <p className="font-display text-muted-foreground text-lg italic">
                — {founderNote.name.split(" ")[0]}
              </p>
            )}

            <div className="flex items-center gap-3">
              {founderNote.avatarSrc ? (
                <Image
                  src={founderNote.avatarSrc}
                  alt={founderNote.name}
                  width={44}
                  height={44}
                  className="border-border/60 h-11 w-11 shrink-0 rounded-full border object-cover"
                />
              ) : (
                <span className="bg-tertiary/10 text-tertiary font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                  {initials}
                </span>
              )}
              <div>
                <a
                  href={siteConfig.links.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-display hover:text-tertiary inline-flex min-h-11 items-center text-base font-semibold transition-colors">
                  {founderNote.name}
                </a>
                <p className="text-muted-foreground font-display text-sm">{founderNote.role}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
