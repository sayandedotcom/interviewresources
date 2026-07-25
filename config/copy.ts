/**
 * Single source of truth for all marketing prose on the site: landing page,
 * how-it-works section, CTA section, FAQs, stats strip, footer, and SEO/OG
 * metadata. Edit strings here; the pages just render them.
 */
export const copyConfig = {
  // ── Meta / SEO / OG ──────────────────────────────────────────────
  tagline: "AI gathers your interview resources. For under $0.50.",
  subtagline:
    "Our AI researches a company's stack, culture, and real interview reports. Every question cites its evidence.",
  /**
   * Keep under ~160 characters. Google truncates past that, and the tail is
   * where the price and the no-subscription promise live — the two things most
   * likely to earn the click.
   */
  metaDescription:
    "AI researches a company's stack, culture, and real interview reports, then gathers the questions you'll face — each backed by evidence. Under $0.50 a report.",
  titleSuffix: "Gather Interview Resources with AI",
  footerTagline: "AI prep intelligence, not prophecy.",
  twitterCreator: "@sayandedotcom",
  /** Alt text for the OG and Twitter card images. */
  ogAlt:
    "Interview Resources: AI gathers your interview resources for under $0.50, each backed by evidence.",

  // ── Landing page ─────────────────────────────────────────────────
  landing: {
    eyebrow: "AI research before the interview",
    heroTitle: {
      line1: "AI gathers your",
      line2: "interview resources.",
      highlight: "For under $0.50.",
    },
    heroSub:
      "Paste a company name. The agent researches the live web for its stack, culture, and real interview reports, then gathers the questions you're most likely to face, each backed by evidence.",
    /**
     * `ariaLabel` disambiguates this from the bottom CTA button, which carries
     * the same visible text but points at /signin. Screen-reader users hitting
     * a link list would otherwise see "Try it for $1" twice with no way to tell
     * which goes where. Keep the visible label as a prefix of the aria-label —
     * WCAG 2.5.3 requires the accessible name to contain the visible text, so
     * voice-control users can still say "click Try it for $1".
     */
    heroCtaPrimary: {
      label: "Try it for $1",
      ariaLabel: "Try it for $1 — see pricing",
      href: "/#pricing",
    },
    heroCtaSecondary: { label: "See how it works", href: "/#how-it-works" },
    heroFomo: "$1 in credits, enough for about two typical reports.",
    /**
     * Plain-prose statement of what the product is, sitting directly below the
     * hero. Google's OAuth branding review reads the homepage looking for the
     * app name exactly as configured on the consent screen, next to a sentence
     * that explains the app's purpose and what it does with a signed-in Google
     * account — the hero's marketing phrasing alone doesn't satisfy it. Keep
     * the first sentence in the form "<app name> is a …".
     */
    about: {
      title: "What is Interview Resources?",
      paragraphs: [
        "Interview Resources is a web app that helps candidates prepare for job interviews. You name the company you're interviewing with, and our AI agent researches its public engineering blogs, job descriptions, first-hand interview reports, and public talks, then produces a report of the questions you're likely to face — each one linked to the source it came from.",
        "You sign in with your Google account. We use only your basic profile data — your Google account ID, name, email address, and profile picture — to create and identify your Interview Resources account. We do not access Gmail, Drive, Calendar, contacts, or other Google services. Reports are billed as one-off credits, with no subscription.",
      ],
    },
    stats: [
      { value: "2,345", label: "Users" },
      { value: "<$0.50", label: "Typical report" },
      { value: "~3 min", label: "Typical runtime" },
      { value: "Linked evidence", label: "On every question" },
    ],
    companies: {
      eyebrow: "Coverage examples",
      title: "Prepare for top tech companies and early-stage startups",
    },
    comparison: {
      sub: "Built for a specific company interview, not generic prompting.",
    },
    faq: {
      eyebrow: "FAQ",
      title: "Frequently Asked Questions",
    },
    pricing: {
      fomo: "Start small, keep the spend capped, and only top up if the research is useful.",
      title: "Simple, transparent pricing",
      subBeforeCap:
        "No plans, no subscription, just credits. Every feature is included in every pack. A report costs what it costs to research: typically about 46 credits, under $0.50, and never more than",
    },
  },

  // ── How-it-works section (landing, scroll-pinned stepper) ────────
  howItWorks: {
    eyebrow: "How it works",
    title: "From company name to evidence-backed questions",
    sub: "Four steps, one AI agent, about three minutes.",
    stages: [
      {
        label: "Target",
        title: "Name your target",
        description:
          "Type the company you're interviewing with; that's all we really need. Add an interviewer to factor in their public talks and writing, then pick the rounds you care about: coding, system design, behavioral, or the whole loop.",
      },
      {
        label: "Research",
        title: "Our AI reads the public web",
        description:
          "In about three minutes, our AI scans engineering blogs, job descriptions, first-hand interview reviews, and public talks, then connects the company's product, stack, and culture to work out what they're likely to ask.",
      },
      {
        label: "Report",
        title: "Your personalized report",
        description:
          "You get the questions you're most likely to hear, grouped by round. Every question carries a confidence level, the evidence it came from so you can verify it yourself, and prep notes on what a strong answer covers.",
      },
      {
        label: "Prep",
        title: "Show up prepared",
        description:
          "Study in the order that counts most, starting with the near-certain questions. Afterward, mark what actually came up; it takes a second and makes every future report sharper.",
      },
    ],
  },

  // ── "Under the hood" agent-transparency bento (landing) ─────────
  agent: {
    eyebrow: "Under the hood",
    title: "How the agent actually works",
    sub: "No black box. Here's exactly what runs when you hit gather, and where your credits go.",
    tiles: [
      {
        name: "It plans before it searches",
        description:
          "The agent resolves the company's real domain and drafts a set of targeted queries, each with a stated purpose, before a single search runs.",
      },
      {
        name: "It reads the live web",
        description:
          "Real-time search across engineering blogs, job posts, and first-hand candidate reviews, then it pulls the full pages that matter, never a stale cache.",
      },
      {
        name: "It researches only what you pick",
        description:
          "Choose your rounds and report sections; the agent skips everything you switched off, enforced in code, so you never pay for evidence you didn't ask for.",
      },
      {
        name: "You set the depth",
        description:
          "Low, Medium, or High tune how wide it searches and how many questions you get, from an 8-question scan to a 50-question sweep, each with a hard spend ceiling.",
      },
      {
        name: "Every claim is checkable",
        description:
          "Each question ships with a confidence level and links to the exact source it came from. No black box; verify any question yourself.",
      },
    ],
  },

  // ── "Why not just ChatGPT?" comparison (landing) ────────────────
  vsChatgpt: {
    eyebrow: "The honest comparison",
    title: "Why not just ask ChatGPT?",
    sub: "A general chatbot can guess at interview questions. Here's what it can't do that we do.",
    chatgptLabel: "Asking ChatGPT",
    usLabel: "Interview Resources",
    rows: [
      {
        point: "Where the answer comes from",
        chatgpt: "Training data with a cutoff date, frozen months ago",
        us: "The live web, researched the moment you hit gather",
      },
      {
        point: "Can you verify it?",
        chatgpt: "No sources; you take its word for it",
        us: "Every question links to the exact evidence it came from",
      },
      {
        point: "How sure is it?",
        chatgpt: "Sounds equally confident whether right or wrong",
        us: "A confidence level on each question; inferred content is labelled",
      },
      {
        point: "How specific is it?",
        chatgpt: "Generic advice for the role, not the company",
        us: "Scoped to your company, chosen rounds, and report sections",
      },
      {
        point: "What it costs you",
        chatgpt: "A monthly subscription whether you interview or not",
        us: "Metered credits with a hard cap per run; pay only when you gather",
      },
    ],
  },

  // ── Confidence explainer (landing) ───────────────────────────────
  confidence: {
    eyebrow: "Reading a report",
    title: "What the confidence badges mean",
    sub: "Every pinpointed question carries a signal for how sure the agent is, so you know where to spend your prep time.",
    levels: [
      {
        label: "High",
        signal: "●●●",
        body: "Multiple independent sources agree. Study these first; they're the safest bet.",
        sample: "Design a rate limiter for the payments API.",
      },
      {
        label: "Medium",
        signal: "●●○",
        body: "Grounded in real evidence, but from fewer or weaker sources. Worth your time, just not first.",
        sample: "Tell me about a time you shipped under an ambiguous deadline.",
      },
      {
        label: "Low",
        signal: "●○○",
        body: "A longer shot. Good for a skim, not where your limited prep hours should go.",
        sample: "How would you improve our onboarding flow?",
      },
    ],
    inferred: {
      label: "Inferred",
      body: "Built from proxy signals rather than a first-hand account of interviewing here. An inferred question can never carry High confidence — see how we source questions above.",
    },
  },

  // ── "How we source questions" transparency (landing) ─────────────
  sourcing: {
    eyebrow: "Transparency",
    title: "Where the questions actually come from",
    sub: "We search the public web, classify what we could reliably read, and synthesize questions from evidence only. Useful unreadable links are kept separately for you to open.",
    beats: [
      {
        name: "First, we hunt for first-hand accounts",
        body: "The agent drafts targeted queries for people who interviewed there, plus what the company publishes about itself. Every promising public result is classified by what we could reliably read. Unreadable results stay in the Research library, but never become evidence.",
        chips: [
          "Glassdoor",
          "Blind",
          "LeetCode Discuss",
          "Forum threads",
          "Personal write-ups",
          "Engineering blogs",
          "Job postings",
          "Interviewer talks & open source",
        ],
        note: "No scraping restricted pages. We do not bypass logins, paywalls, robots controls, CAPTCHAs, or other access restrictions.",
      },
      {
        name: "Then we count what came back",
        body: "A result only counts as evidence when it contains reliable, substantive content—not merely a title, thin snippet, or navigation blurb. Link-only resources never create claims, citations, summaries, or confidence. When evidence is thin, the agent broadens its search instead of pretending the report is complete.",
      },
    ],
    rules: {
      label: "Two rules we can't override",
      sub: "Applied in code after the model answers, not instructions we ask it to follow.",
      items: [
        {
          rule: "No evidence citation, no confidence",
          body: "If a question comes back without a citation to readable evidence, its confidence is forced to Low. A discovery link that must be opened manually never counts.",
        },
        {
          rule: "Inferred can never be High",
          body: "When a question is built from proxy signals instead of first-hand accounts, its confidence is capped at Medium and it ships with the Inferred tag.",
        },
      ],
    },
  },

  // ── Unknown / early-stage companies (landing) ───────────────────
  /**
   * Documents a mechanism that already ships, so every number here traces to
   * code rather than to marketing: the threshold is SPARSE_DIRECT_THRESHOLD
   * (lib/research/sparsity.ts), the four signals are the proxy categories in
   * proxyPlanStage (lib/research/pipeline/plan.ts), and `panel.broaden` is the
   * exact progress line the pipeline streams to users. Keep them in step.
   */
  unknownCompanies: {
    eyebrow: "When there's no public data",
    title: "How we research small, early-stage startups",
    sub: "Most people aren't interviewing at Google. When a company is twenty people with no Glassdoor page, the agent doesn't shrug and hand you an empty report — it changes what it goes looking for.",
    panel: {
      label: "Direct evidence",
      query: "acme labs interview experience",
      rows: [
        { source: "Glassdoor", result: "No reviews" },
        { source: "LeetCode Discuss", result: "No threads" },
        { source: "Blind", result: "Nothing found" },
      ],
      threshold: "2 / 3",
      thresholdLabel: "substantial sources",
      thresholdTag: "Below threshold",
      /** Verbatim from lib/research/pipeline/index.ts — what the run actually says. */
      broaden:
        "Public interview data is thin — researching founders, funding stage, and similar companies...",
    },
    signalsLabel: "So it goes looking for four things instead",
    signals: [
      {
        name: "Founder background",
        body: "Where the people who built it came from. A CTO who spent four years at Stripe carries Stripe's interview instincts into their own loop.",
      },
      {
        name: "Funding stage & size",
        body: "Seed and Series B interview nothing alike. Fourteen engineers run a different loop than four hundred.",
      },
      {
        name: "Comparable companies",
        body: "How similar-stage companies building similar things actually run their interviews.",
      },
      {
        name: "Role norms",
        body: "What a loop for your role and your stack typically looks like at a seed-to-Series-B startup.",
      },
    ],
    closer:
      "Everything this second pass produces ships tagged Inferred and can never claim High confidence — capped in code after the model answers, not asked of it. You'll always know which questions came from someone who actually sat the interview, and which are a reasoned read of how this company probably runs one.",
  },

  // ── Fair-billing guarantee strip (landing) ──────────────────────
  guarantee: {
    items: [
      {
        title: "Metered billing",
        body: "You're charged only what a run actually spends, never a flat fee.",
      },
      {
        title: "Hard cap every run",
        body: "A run can never spend past its effort ceiling or your balance.",
      },
      {
        title: "No subscription",
        body: "Buy credits once and spend them only when you run a report.",
      },
    ],
  },

  // ── Founder note (landing, right before the final CTA) ──────────
  founderNote: {
    eyebrow: "A note from the builder",
    paragraphs: [
      "I built this after one too many evenings lost to Glassdoor threads and half-updated Reddit posts, trying to guess what an interview would actually cover. A coaching call cost more than the job hunt could justify, and a generic question bank never knew which company I was even talking to.",
      "So Interview Resources does the digging I used to do by hand, shows its sources instead of asking you to trust it, and costs less than a coffee per report. If the public data on a company is thin, it says so instead of pretending otherwise. That's the whole promise: real research, shown honestly, priced fairly.",
    ],
    name: "Sayan De",
    role: "Builder, Interview Resources",
    /** Drop the files in /public and point these at them, e.g. "/founder.jpg"
     * and "/signature.png". Left empty, the memo falls back to initials and a
     * typed sign-off, so the section renders fine either way. */
    avatarSrc: "",
    signatureSrc: "",
  },

  // ── CTA section (shared) ─────────────────────────────────────────
  cta: {
    title: "Know the questions before you walk in.",
    subtitle: "AI-researched, evidence-backed reports for under $0.50 each. No subscription.",
    signedOutLabel: "Try it for $1",
    /** See landing.heroCtaPrimary.ariaLabel — same visible text, /signin instead. */
    signedOutAriaLabel: "Try it for $1 — sign in to get started",
    signedInLabel: "Get started",
    closer:
      "$1 gets you enough credits to see whether the research is useful for your next interview.",
  },

  // ── FAQs ──────────────────────────────────────────────────────────
  faqs: [
    {
      question: "How does Interview Resources work?",
      answer:
        "You enter the company you're interviewing with, select the interview rounds you're preparing for, and our AI researches publicly available information to pinpoint the questions you might face. Each question comes with evidence and prep notes.",
    },
    {
      question: "How much does it cost?",
      answer:
        "A typical report is under $0.50. You buy credits once (the $1 Starter pack covers about two reports) and spend them only when you run a report. No subscription, no monthly fee.",
    },
    {
      question: "How long does a report take?",
      answer:
        "About 3 minutes. Start the research, and your report is ready by the time you're back from making a coffee.",
    },
    {
      question: "Is this legal? Do you scrape LinkedIn?",
      answer:
        "We discover publicly visible links through web search, but never bypass logins, paywalls, robots controls, CAPTCHAs, or private profiles. An inaccessible result — including LinkedIn — may appear as an Open manually link, but we do not read it or use it as evidence. Interviewer names are only search seeds for public work like talks or blog posts.",
    },
    {
      question: "What does Google sign-in let you access?",
      answer:
        "Only your name, email address, and profile picture so we can create and identify your account. We do not read Gmail, Drive, Calendar, contacts, or any other Google data.",
    },
    {
      question: "How accurate are the results?",
      answer:
        "Every question comes with a confidence score and evidence links. When evidence is strong, confidence is high. When we're working with limited data, we say so honestly.",
    },
    {
      question: "What companies work best?",
      answer:
        "Tech companies with active engineering blogs, published interview processes, or candidates who share their experiences online tend to have the richest data. When a company is too new or too small for any of that, the agent doesn't give up — it broadens into the founders' backgrounds, the funding stage, and how comparable companies interview, and labels what it infers from that.",
    },
    {
      question: "What if the company is too small to have any public data?",
      answer:
        "That's the common case, and it's handled. When the agent can't find enough first-hand interview evidence, it automatically runs a second pass over four proxy signals: the founders' backgrounds and where they worked before, the company's funding stage and size, how comparable companies in the same domain interview, and the norms for your role and stack at startups that size. Questions built that way ship tagged Inferred and are capped below High confidence, so you can always tell them apart from evidence-backed ones.",
    },
    {
      question: "Can I use this for any interview type?",
      answer:
        "Yes. We cover DSA, system design, behavioral, domain quizzes, take-home projects, pair programming, and HR/culture rounds.",
    },
  ],

  // ── Changelog (/changelog) ───────────────────────────────────────
  /**
   * Same rule as config/public-claims.ts: nothing lands here that isn't
   * verifiably true. This page previously shipped two invented releases dated
   * 18 months before the repository's first commit — on a product whose pitch
   * is "we show our sources", that is the most expensive kind of copy to get
   * wrong.
   *
   * Two conventions that keep it honest:
   *  - User-visible changes only. Refactors and dependency bumps are what the
   *    git log is for; this is for people deciding whether to spend $1.
   *  - `date` renders verbatim, so keep it at a precision you can defend.
   *    Month-level is fine. An invented day is not.
   *
   * No version numbers until releases are actually tagged — `0.1.0` in
   * package.json is a default, not a release. The page renders an honest empty
   * state when this list is empty, so removing an entry is always safe.
   */
  changelog: [
    {
      date: "July 2026",
      title: "First public release",
      changes: [
        "Paste a company name and get the questions you're most likely to face, grouped by interview round, each with a confidence level and links to the evidence behind it.",
        "Choose which rounds and report sections to research — the agent skips what you switch off, so you don't pay for it.",
        "See the credit estimate for a run before you commit to it, and pick an effort level to cap the spend.",
        "When public interview data on a company is thin, the agent broadens into founder backgrounds, funding stage, and how comparable companies interview — and labels those questions Inferred rather than passing them off as evidence.",
        "Extend a finished report with extra rounds without re-running the research you already paid for.",
        "Export a report as PDF or JSON, copy it as a ready-made prompt, or share it as a read-only link.",
        "Credit packs instead of a subscription: buy once, spend only when you run a report.",
        "Sign in with Google. Export your data or delete your account from settings at any time.",
      ],
    },
  ],

  // ── Pricing page (/pricing) ──────────────────────────────────────
  /**
   * The landing page and /pricing used to render character-identical headings
   * and the same body copy, which leaves Google to pick a winner between two
   * URLs competing on the same text. The landing block stays a summary aimed at
   * a first-time visitor; this page owns the mechanics — what a credit is, what
   * a run actually costs, and what happens at the cap.
   */
  pricingPage: {
    fomo: "No subscription to cancel, and nothing is charged until you run a report.",
    title: "Credits, not subscriptions",
    sub: "You buy credits once and spend them only when the agent actually researches something. Here is exactly how that is metered.",
    details: {
      title: "How a report is metered",
      items: [
        {
          title: "A credit is a unit of research spend",
          body: "Credits map to what a run costs to execute — the searches it makes and the pages it reads. They are not a per-question or per-report allowance, which is why two reports on different companies can cost different amounts.",
        },
        {
          title: "A typical run is about 46 credits",
          body: "Under $0.50. A company with a thin public footprint costs more, because the agent broadens its search rather than shipping you a thin report.",
        },
        {
          title: "Every run has a hard ceiling",
          body: "A single run can never spend past its effort ceiling or your remaining balance, whichever comes first. There is no overage and no way to end up owing anything.",
        },
        {
          title: "You choose what gets researched",
          body: "Pick your interview rounds and report sections up front. The agent skips everything you switched off — enforced in code — so you are not paying for research you did not ask for.",
        },
      ],
    },
  },

  // ── Help centre (/help) ──────────────────────────────────────────
  /**
   * Deliberately operational — "how do I do X" — where `faqs` above is
   * pre-purchase. Kept apart so the two pages don't answer the same question
   * twice and compete with each other. The page renders from this and so does
   * its FAQPage markup, so the two can't drift.
   */
  helpFaqs: [
    {
      section: "Getting started",
      items: [
        {
          question: "How do I create an account?",
          answer:
            "Click Sign in in the header and continue with Google. That's the whole signup — there's no separate account creation step, and you can run your first report straight after.",
        },
        {
          question: "How does credit-based pricing work?",
          answer:
            "You buy credits once and spend them only when you run a report. A report is metered at what it actually cost to research, so the price varies: a typical run is about 46 credits — under $0.50 — and a single run can never exceed its effort ceiling or your remaining balance.",
        },
        {
          question: "What payment methods do you accept?",
          answer:
            "All major credit cards, through our payment provider. Prices are shown in USD and converted to your local currency at checkout, so the amount your bank charges may be in your own currency.",
        },
      ],
    },
    {
      section: "Running a report",
      items: [
        {
          question: "What information should I include?",
          answer:
            "The company name is the only requirement. Adding the job description, your years of experience, your tech stack, and any interview format you already know about narrows the research and produces sharper questions.",
        },
        {
          question: "Can I choose which rounds get researched?",
          answer:
            "Yes. You pick the interview rounds and report sections you want. The agent skips everything you switched off — enforced in code, not just in the prompt — so you never pay for research you didn't ask for.",
        },
        {
          question: "How long does research take?",
          answer:
            "Most reports finish in about three minutes. Requests that need several rounds of searching take longer.",
        },
      ],
    },
    {
      section: "Reading your report",
      items: [
        {
          question: "What's in a report?",
          answer:
            "The questions you're most likely to hear, grouped by round. Every question carries a confidence level, the evidence it came from so you can verify it yourself, and prep notes on what a strong answer covers.",
        },
        {
          question: "What do the confidence levels mean?",
          answer:
            "They tell you how much evidence sits behind a question. High confidence means multiple substantial sources said the same thing. Lower confidence means the evidence was real but thinner. Questions the agent inferred rather than found are tagged Inferred and capped below High, so you can always tell them apart.",
        },
        {
          question: "Why do some sources say “open manually”?",
          answer:
            "Because we found the link but never read the page. We don't bypass logins, paywalls, robots controls, or CAPTCHAs. When a result is behind one of those, we keep the link so you can open it yourself, but it is never counted as evidence.",
        },
        {
          question: "Can I save my reports?",
          answer:
            "Yes. Reports are saved to your account, so you can come back to them from any device.",
        },
      ],
    },
  ],
};
