/**
 * Single source of truth for all marketing prose on the site: landing page,
 * how-it-works section, CTA section, FAQs, stats strip, footer, and SEO/OG
 * metadata. Edit strings here; the pages just render them.
 */
export const copyConfig = {
  // ── Meta / SEO / OG ──────────────────────────────────────────────
  tagline: "AI pinpoints your interview questions. For under $0.50.",
  subtagline:
    "Our AI researches a company's stack, culture, and real interview reports. Every question cites its evidence.",
  metaDescription:
    "Interview Scout's AI researches a company's stack, culture, and real interview reports, then pinpoints the questions you'll face, each backed by evidence. Under $0.50 a report, no subscription.",
  titleSuffix: "AI Interview Question Predictions",
  footerTagline: "AI prep intelligence, not prophecy.",
  twitterCreator: "@sayandedotcom",
  /** Alt text for the OG and Twitter card images. */
  ogAlt:
    "Interview Scout: AI pinpoints your interview questions for under $0.50, each backed by evidence.",

  // ── Landing page ─────────────────────────────────────────────────
  landing: {
    eyebrow: "AI reconnaissance before the interview",
    heroTitle: {
      line1: "AI pinpoints your",
      line2: "interview questions.",
      highlight: "For under $0.50.",
    },
    heroSub:
      "Paste a company name. Our AI researches its stack, culture, and real interview reports, then pinpoints the questions you'll face, each backed by evidence.",
    heroCtaPrimary: { label: "Try it for $1", href: "/#pricing" },
    heroCtaSecondary: { label: "See how it works", href: "/#how-it-works" },
    heroFomo:
      "Someone else interviewing for your role is already prepping with the questions. Are you?",
    stats: [
      { value: "<$0.50", label: "Per report" },
      { value: "~3 min", label: "Start to finish" },
      { value: "100%", label: "Questions cite evidence" },
      { value: "$0", label: "Subscription fees" },
    ],
    companies: {
      eyebrow: "Trusted for",
      title: "Prepare for top tech companies & also for any staged startups",
    },
    comparison: {
      sub: "AI research built for your exact interview, compared to the alternatives",
    },
    faq: {
      eyebrow: "FAQ",
      title: "Frequently Asked Questions",
    },
    pricing: {
      fomo: "Every interview you take unprepared is a $100K coin flip.",
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
    sub: "No black box. Here's exactly what runs when you hit scout, and where your credits go.",
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
        name: "It won't invent answers",
        description:
          "When public interview data is thin, it researches founders, funding, and similar companies instead of guessing, and clearly labels anything it inferred.",
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
    usLabel: "Interview Scout",
    rows: [
      {
        point: "Where the answer comes from",
        chatgpt: "Training data with a cutoff date, frozen months ago",
        us: "The live web, researched the moment you hit scout",
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
        us: "Metered credits with a hard cap per run; pay only when you scout",
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
      body: "When public interview data for a company is thin, the agent researches proxy signals instead: founders' backgrounds, comparable companies, and stage norms. Anything built this way is labelled Inferred, so you always know whether a question comes from a first-hand account or an educated guess.",
    },
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
      "So Interview Scout does the digging I used to do by hand, shows its sources instead of asking you to trust it, and costs less than a coffee per report. If the public data on a company is thin, it says so instead of pretending otherwise. That's the whole promise: real research, shown honestly, priced fairly.",
    ],
    name: "Sayan De",
    role: "Builder, Interview Scout",
  },

  // ── CTA section (shared) ─────────────────────────────────────────
  cta: {
    title: "Know the questions before you walk in.",
    subtitle: "AI-researched, evidence-backed reports for under $0.50 each. No subscription.",
    signedOutLabel: "Try it for $1",
    signedInLabel: "Get started",
    closer: "Can't you spend $1 for your $100K job?",
  },

  // ── FAQs ──────────────────────────────────────────────────────────
  faqs: [
    {
      question: "How does Interview Scout work?",
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
        "We only use publicly available web search results. We never scrape LinkedIn or access private profiles. Interviewer names are used only as a search seed to find their public work like talks or blog posts.",
    },
    {
      question: "How accurate are the results?",
      answer:
        "Every question comes with a confidence score and evidence links. When evidence is strong, confidence is high. When we're working with limited data, we say so honestly.",
    },
    {
      question: "What companies work best?",
      answer:
        "Tech companies with active engineering blogs, published interview processes, or candidates who share their experiences online tend to have the richest data.",
    },
    {
      question: "Can I use this for any interview type?",
      answer:
        "Yes. We cover DSA, system design, behavioral, domain quizzes, take-home projects, pair programming, and HR/culture rounds.",
    },
  ],
};
