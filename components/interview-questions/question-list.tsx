"use client";

import { useState } from "react";

import { motion, useReducedMotion } from "motion/react";

import { QuestionCard } from "@/components/interview-questions/question-card";

import type { PublicQuestion } from "@/lib/publishing/public-report";
import { categoryLabel } from "@/lib/research/display";
import { cn } from "@/lib/utils";

/**
 * Below these thresholds the filter is noise: with one category it filters
 * nothing, and over a handful of cards there is nothing to lose track of.
 * A published page shows `PUBLIC_QUESTION_LIMIT` questions, so this is close
 * to the boundary by design.
 */
const MIN_CATEGORIES_FOR_FILTER = 2;
const MIN_QUESTIONS_FOR_FILTER = 5;

const ALL = "__all__";

export function QuestionList({ questions }: { questions: PublicQuestion[] }) {
  const [active, setActive] = useState<string>(ALL);
  const reduce = useReducedMotion();

  const categories = [...new Set(questions.map((question) => question.category))];
  const showFilter =
    categories.length >= MIN_CATEGORIES_FOR_FILTER && questions.length >= MIN_QUESTIONS_FOR_FILTER;

  const filters = [
    { value: ALL, label: `All ${questions.length}` },
    ...categories.map((category) => ({ value: category, label: categoryLabel(category) })),
  ];

  return (
    <div>
      {showFilter && (
        <div role="group" aria-label="Filter questions by round" className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const isActive = active === filter.value;

            return (
              <button
                key={filter.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActive(filter.value)}
                className={cn(
                  "font-display relative inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-[13px] font-medium transition-colors",
                  isActive ? "text-white" : "text-muted-foreground hover:text-foreground bg-muted"
                )}>
                {isActive && (
                  // A shared layoutId slides the fill between chips instead of
                  // cutting, matching the header's active-nav indicator.
                  <motion.span
                    layoutId="question-filter-active"
                    className="bg-primary absolute inset-0 rounded-full"
                    transition={
                      reduce ? { duration: 0 } : { type: "spring", duration: 0.4, bounce: 0.15 }
                    }
                  />
                )}
                <span className="relative">{filter.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Every question stays in the DOM; filtering only hides. These pages
          exist to be crawled, and a filter that unmounts cards would hand a
          crawler whichever subset happened to be selected.
          For the same reason there is no scroll-entrance animation here: an
          `opacity: 0` initial state means a reader — or a renderer — that never
          fires the observer gets a page with no questions on it. */}
      <ul className={cn("space-y-5", showFilter && "mt-6")}>
        {questions.map((question) => (
          <li
            key={question.question}
            className={cn(active !== ALL && question.category !== active && "hidden")}>
            <QuestionCard question={question} />
          </li>
        ))}
      </ul>
    </div>
  );
}
