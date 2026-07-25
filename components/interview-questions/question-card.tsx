import { ArrowUpRight } from "lucide-react";

import type { PublicQuestion } from "@/lib/publishing/public-report";
import { CONFIDENCE_META, categoryLabel, hostLabel } from "@/lib/research/display";
import { cn } from "@/lib/utils";

const FILLED_SEGMENTS = { high: 3, medium: 2, low: 1 } as const;

/**
 * Confidence as a three-segment meter rather than a second coloured pill.
 *
 * Category and confidence are different kinds of fact — one names the round,
 * the other grades the claim — and rendering both as pills made them compete
 * for the same attention while the question itself came third.
 */
function ConfidenceMeter({ confidence }: { confidence: PublicQuestion["confidence"] }) {
  const filled = FILLED_SEGMENTS[confidence];
  const label = CONFIDENCE_META[confidence].label;

  return (
    <span className="ml-auto flex shrink-0 items-center gap-2">
      <span aria-hidden className="flex items-center gap-0.5">
        {[0, 1, 2].map((segment) => (
          <span
            key={segment}
            className={cn("h-1 w-3 rounded-full", segment < filled ? "bg-primary" : "bg-border")}
          />
        ))}
      </span>
      <span className="text-muted-foreground text-[11px] font-medium">{label} confidence</span>
    </span>
  );
}

const BASIS_LABEL = { inferred: "Inferred", baseline: "Role-standard" } as const;

export function QuestionCard({ question }: { question: PublicQuestion }) {
  return (
    <article className="silver-edge bg-background rounded-2xl p-6 shadow-[var(--shadow-xs)] sm:p-7">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        {/* `categoryLabel`, not the raw identifier — the stored value is an
            internal code like `system_design`, which reads as unfinished on a
            page meant to rank. */}
        <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs font-medium">
          {categoryLabel(question.category)}
        </span>
        {question.basis !== "evidence" && (
          <span className="border-border text-muted-foreground rounded-full border px-2.5 py-1 text-xs font-medium">
            {BASIS_LABEL[question.basis]}
          </span>
        )}
        <ConfidenceMeter confidence={question.confidence} />
      </div>

      <h3 className="font-display mt-4 text-lg leading-snug font-semibold tracking-tight">
        {question.question}
      </h3>
      <p className="font-display text-muted-foreground mt-2 leading-relaxed">
        {question.rationale}
      </p>

      {question.evidenceUrls.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium">Evidence</span>
          {question.evidenceUrls.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="silver-edge bg-background text-foreground/80 hover:text-primary ease-out-strong inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors duration-150">
              {hostLabel(url)}
              <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
