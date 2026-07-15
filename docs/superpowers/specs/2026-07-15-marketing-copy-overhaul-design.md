# Marketing Copy Overhaul — AI-Forward, Price-Led, Single Copy File

## Problem

The landing page never mentioned AI, had no price hook, and carried fabricated social proof
("34,345 users" badge, "50K+ Questions Predicted", "94% User Satisfaction", six fictional
testimonials). The `/how-it-works` page was confusing — overlapping benefit/step blocks and a
FAQ that duplicated the landing FAQ — and made claims inconsistent with the pricing page ("a
report costs about $0.40" vs. "~46 credits" elsewhere) or outright false ("Your first report is
free" — no free signup credits exist in the codebase). Copy was also scattered across hardcoded
JSX in three page files plus six separate `config/*.ts` modules, making it hard to find and edit.

## Decisions

- Standard price claim everywhere: **"Under $0.50 a report"** (typical report ≈ 46 credits ≈
  $0.46; 1 credit = $0.01). Secondary hook: **"Try it for $1"** ($1 Starter pack = 100 credits ≈
  2 reports).
- Removed the false "first report is free" claim — copy-only fix, no backend change (no free
  signup credits exist).
- Replaced fabricated stats with true product facts (`<$0.50` per report, `~3 min` start to
  finish, `100%` of questions cite evidence, `$0` subscription fees); deleted the fictional
  testimonials section and `config/testimonials.ts`.
- AI-forward wording throughout — the word "AI" now appears in the hero, eyebrow, stats,
  section headings, FAQ, and CTA, where it previously never appeared.
- Approved hero:
  - H1: "AI predicts your interview questions. For under $0.50."
  - Sub: "Paste a company name. Our AI researches its stack, culture, and real interview
    reports — then predicts the questions you'll face, each backed by evidence."
  - CTAs: "Try it for $1" (→ `/#pricing`) / "See how it works" (→ `/how-it-works`).
- **Centralized all marketing copy into one file, `config/copy.ts`**, so future copy edits don't
  require hunting through JSX or six separate config modules. `config/faqs.ts`, `config/stats.ts`,
  and `config/cta.ts` were merged into it and deleted; `site.ts` now sources `faqs`/`cta`/`stats`
  from `copyConfig`.

## Structure of `config/copy.ts`

```
copyConfig = {
  tagline, subtagline, metaDescription, titleSuffix, footerTagline, twitterCreator, ogAlt,
  landing: { eyebrow, badge, heroTitle, heroSub, heroCtaPrimary, heroCtaSecondary,
             stats, companies, steps, comparison, faq, pricing },
  howItWorks: { metaTitle, heroTitle, heroSub, benefits, stepsOverline, ctaBox },
  cta: { title, subtitle, signedOutLabel, signedInLabel },
  faqs: [...],
}
```

Product data that isn't prose stays in its own file: `config/pricing.ts` (Dodo product IDs,
prices), `config/comparison.ts`, `config/companies.ts`, `config/keywords.ts`, `config/brand.ts`,
`config/contact.ts`.

## How-it-works restructure

Removed the page-local FAQ block (5 Q&As, duplicating the landing FAQ and containing the false
"first report is free" / stale "$0.40" claims). Its two unique, corrected items ("How much does
it cost?", "How long does a report take?") were folded into the shared `copyConfig.faqs` list
used by the landing page. The page now flows: hero → 3 benefit cards → 4 numbered steps → one CTA
box, with no duplicated content.

## Out of scope

Product UI copy (e.g. "Run reconnaissance" button in the research form), backend logic, pricing
math, and `locales/en.json`/`de.json` (confirmed unwired at runtime — no i18n imports exist
anywhere in the app — left untouched as stale artifacts).

## Verification

`pnpm build`, `pnpm test`, `pnpm lint:check`, `pnpm format:check`; manual grep to confirm no
fabricated/false claims remain (`34,345`, `$0.40`, `first report is free`, `Question Guesser`);
manual browser pass of `/`, `/pricing`, `/how-it-works`, and the OG/Twitter image routes.
