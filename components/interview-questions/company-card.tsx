import Link from "next/link";

import { ArrowRight } from "lucide-react";

import type { PublishedPageCard } from "@/lib/publishing/company-pages";
import { categoryLabel, companyMonogram } from "@/lib/research/display";

/** How many category chips fit before the card starts wrapping to a third line. */
const MAX_CATEGORY_CHIPS = 3;

/**
 * One company in the directory grid.
 *
 * The monogram is deliberately one uniform treatment rather than a colour
 * derived from the name: a per-company hue reads as arbitrary next to a palette
 * this disciplined, and there is no logo on the summary row to justify it.
 */
export function CompanyCard({ page }: { page: PublishedPageCard }) {
  const extraCategories = page.categories.length - MAX_CATEGORY_CHIPS;

  return (
    <Link
      href={`/interview-questions/${page.slug}`}
      className="silver-edge bg-background ease-out-strong group flex h-full flex-col rounded-2xl p-6 shadow-[var(--shadow-xs)] transition-[box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="bg-brand-50 text-brand-700 ring-brand-200/60 font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ring-1">
          {companyMonogram(page.companyName)}
        </span>
        <h2 className="font-display min-w-0 truncate text-base font-semibold tracking-tight">
          {page.companyName}
        </h2>
        <ArrowRight
          aria-hidden
          className="text-muted-foreground group-hover:text-primary ml-auto h-4 w-4 shrink-0 transition-[color,translate] duration-200 group-hover:translate-x-0.5"
        />
      </div>

      {page.blurb && (
        <p className="font-display text-muted-foreground mt-4 line-clamp-2 text-sm leading-relaxed">
          {page.blurb}
        </p>
      )}

      {page.categories.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {page.categories.slice(0, MAX_CATEGORY_CHIPS).map((category) => (
            <span
              key={category}
              className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium">
              {categoryLabel(category)}
            </span>
          ))}
          {extraCategories > 0 && (
            <span className="text-muted-foreground px-1 py-0.5 text-[11px] font-medium">
              +{extraCategories}
            </span>
          )}
        </div>
      )}

      {/* mt-auto, so the meta row sits on the card's floor and the rows line up
          across a grid of cards with blurbs of different lengths. */}
      <p className="text-muted-foreground mt-auto pt-5 text-xs tabular-nums">
        {page.questionCount} questions
        <span aria-hidden className="px-1.5">
          ·
        </span>
        {page.evidenceCount} evidenced
        <span aria-hidden className="px-1.5">
          ·
        </span>
        {page.sourceCount} sources
      </p>
    </Link>
  );
}
