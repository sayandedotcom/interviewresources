/**
 * Single source of truth for all marketing prose on the site — landing page,
 * how-it-works page, CTA section, FAQs, stats strip, footer, and SEO/OG
 * metadata. Edit strings here; the pages just render them.
 */
export const copyConfig = {
  // ── Meta / SEO / OG ──────────────────────────────────────────────
  tagline: "AI predicts your interview questions. For under $0.50.",
  subtagline:
    "Our AI researches a company's stack, culture, and real interview reports — every question cites its evidence.",
  metaDescription:
    "Interview Scout's AI researches a company's stack, culture, and real interview reports, then predicts the questions you'll face — each backed by evidence. Under $0.50 a report, no subscription.",
  titleSuffix: "AI Interview Question Predictions",
  footerTagline: "AI prep intelligence, not prophecy.",
  twitterCreator: "@sayandedotcom",
  /** Alt text for the OG and Twitter card images. */
  ogAlt:
    "Interview Scout — AI predicts your interview questions for under $0.50, each backed by evidence.",

  // ── Landing page ─────────────────────────────────────────────────
  landing: {
    eyebrow: "AI reconnaissance before the interview",
    heroTitle: {
      line1: "AI predicts your",
      line2: "interview questions.",
      highlight: "For under $0.50.",
    },
    heroSub:
      "Paste a company name. Our AI researches its stack, culture, and real interview reports — then predicts the questions you'll face, each backed by evidence.",
    heroCtaPrimary: { label: "Try it for $1", href: "/#pricing" },
    heroCtaSecondary: { label: "See how it works", href: "/how-it-works" },
    stats: [
      { value: "<$0.50", label: "Per report" },
      { value: "~3 min", label: "Start to finish" },
      { value: "100%", label: "Questions cite evidence" },
      { value: "$0", label: "Subscription fees" },
    ],
    companies: {
      eyebrow: "Trusted for",
      title: "Prepare for top tech companies",
    },
    steps: {
      eyebrow: "How it works",
      title: "Three steps to an AI scouting report",
      sub: "From company name to evidence-backed questions in about 3 minutes",
    },
    comparison: {
      sub: "AI research built for your exact interview — compared to the alternatives",
    },
    faq: {
      eyebrow: "FAQ",
      title: "Frequently Asked Questions",
    },
    pricing: {
      title: "Simple, transparent pricing",
      subBeforeCap:
        "No plans, no subscription — just credits. Every feature is included in every pack. A report costs what it costs to research: typically about 46 credits — under $0.50 — and never more than",
    },
  },

  // ── How-it-works page ────────────────────────────────────────────
  howItWorks: {
    metaTitle: "How it works",
    heroTitle: "How our AI predicts your interview questions",
    heroSub:
      "Instead of spending your evenings hunting through blogs, forums, and Glassdoor threads, you paste one company name. Our AI does the digging and hands you the questions you're most likely to face — each one backed by real evidence you can check yourself, for under $0.50 a report.",
    benefits: [
      {
        title: "Save hours of research",
        body: "What normally takes an evening of manual searching takes about 3 minutes. You get a finished report while you grab a coffee.",
      },
      {
        title: "Costs less than a coffee",
        body: "A full report runs under $0.50 — no subscription, no coaching fees, no hourly rate. You only pay for the reports you actually run.",
      },
      {
        title: "Prep with confidence",
        body: "Stop guessing what to study. Focus your limited prep time on the questions most likely to come up — and know why each one made the list.",
      },
    ],
    stepsOverline: "From company name to a prep plan in four steps",
    ctaBox: {
      title: "Your next interview is worth 3 minutes",
      sub: "Enter a company name and see the questions that might be coming. A typical report is under $0.50 — the $1 Starter pack covers about two.",
      primary: { label: "Try it for $1", href: "/#pricing" },
      secondary: { label: "Run a report", href: "/" },
    },
  },

  // ── CTA section (shared) ─────────────────────────────────────────
  cta: {
    title: "Know the questions before you walk in.",
    subtitle: "AI-researched, evidence-backed reports for under $0.50 each. No subscription.",
    signedOutLabel: "Try it for $1",
    signedInLabel: "Get started",
  },

  // ── FAQs ──────────────────────────────────────────────────────────
  faqs: [
    {
      question: "How does Interview Scout work?",
      answer:
        "You enter the company you're interviewing with, select the interview rounds you're preparing for, and our AI researches publicly available information to predict the questions you might face. Each prediction comes with evidence and prep notes.",
    },
    {
      question: "How much does it cost?",
      answer:
        "A typical report is under $0.50. You buy credits once — the $1 Starter pack covers about two reports — and spend them only when you run a report. No subscription, no monthly fee.",
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
      question: "How accurate are the predictions?",
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
