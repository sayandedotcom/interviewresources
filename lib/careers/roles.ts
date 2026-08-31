/**
 * The open roles, as data.
 *
 * Kept in code rather than the database on purpose: a job post is content that
 * ships with a deploy and wants review in a pull request, and there are three
 * of them. The database side of careers is only the inbound applications
 * (`job_applications`), which is the part that actually grows.
 *
 * `slug` is the URL and the value stored on every application row, so treat it
 * as permanent. Retitling a role is free; renaming its slug orphans the
 * applications already filed under the old one.
 */

export interface Role {
  slug: string;
  title: string;
  /** One line, used on the index card and as the meta description seed. */
  tagline: string;
  location: string;
  type: string;
  /** Rendered as a compact chip row above the JD. */
  stack: string[];
  /** Two or three paragraphs. What the role actually is. */
  about: string[];
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  /** How we run the loop. Answers the question every candidate asks first. */
  process: string[];
}

export const roles: Role[] = [
  {
    slug: "full-stack-ai-engineer-frontend",
    title: "Full Stack AI Engineer (Front-end leaning)",
    tagline:
      "Own the surface people actually touch: the research flow, the report, and the interface that makes a model's output feel trustworthy.",
    location: "Remote",
    type: "Full time",
    stack: ["TypeScript", "Next.js", "React", "Tailwind CSS", "AI SDK", "Postgres"],
    about: [
      "Interview Resources turns a company name into an evidence-graded interview report. Every question we show is labelled by how well it is grounded, and every claim carries the source it came from. That honesty is the product, and most of it is a front-end problem: a model can produce a confident paragraph in a second, and the interface has to make clear which parts of it are earned.",
      "This role owns that surface. You will build the research form, the streaming run view, and the report itself, and you will go as deep into the backend as the feature needs. Front-end leaning means where you spend most of your week, not a wall you stop at. The work is close to the model, so you will spend real time on streaming, partial states, retries, and the long tail of ways a generative flow fails in front of a paying user.",
      "We are small. You will pick the components, name the routes, and decide what a screen looks like. Nobody is going to hand you a Figma file for every ticket.",
    ],
    responsibilities: [
      "Design and build product surfaces end to end in Next.js and React, from the route and the data fetch through to the last hover state.",
      "Make streaming and long-running AI work legible: progress that means something, partial results that stay readable, and failures that explain themselves.",
      "Turn a graded report into an interface a candidate can scan in two minutes and trust, including the parts where we say we do not know.",
      "Build the server routes, database queries, and schema changes your features need, in Drizzle and Postgres.",
      "Hold the line on accessibility, keyboard behaviour, dark mode, and mobile. These are requirements here, not a polish pass.",
      "Write tests that survive refactors: Vitest for units and components, Playwright for the flows that take someone's money.",
      "Watch what real users do after you ship, then fix what the data says is broken instead of what is fun to fix.",
    ],
    requirements: [
      "Three or more years building production web applications in TypeScript, with a large share of it in React.",
      "Real, current experience with a modern React framework and its server rendering model. We run Next.js App Router.",
      "You can build a UI from a rough description and a product goal, without a pixel-level design to trace.",
      "Comfort writing SQL and reasoning about a relational schema, not only calling an ORM and hoping.",
      "You have shipped something that talks to an LLM API in production, and you know why the second version was different from the first.",
      "Clear written communication. Most of what you decide here gets decided in writing.",
    ],
    niceToHave: [
      "Strong visual instincts and a portfolio of interfaces you are proud of.",
      "Experience with streaming responses, server-sent events, or the AI SDK.",
      "Familiarity with Tailwind CSS v4 and modern component primitives.",
      "You have worked at a company small enough that you also answered support tickets.",
    ],
    process: [
      "Intro call, thirty minutes, with the founder.",
      "A paid take-home you can finish in a focused afternoon, built on the real stack.",
      "A ninety minute working session on your take-home: we extend it together.",
      "A final conversation about scope, money, and what the first ninety days look like.",
    ],
  },
  {
    slug: "full-stack-ai-engineer-backend",
    title: "Full Stack AI Engineer (Back-end leaning)",
    tagline:
      "Own the research pipeline: retrieval, grading, cost control, and the queue that keeps a multi-minute run from falling over.",
    location: "Remote",
    type: "Full time",
    stack: ["TypeScript", "Node.js", "Postgres", "Drizzle", "AI SDK", "Vercel"],
    about: [
      "Behind every report is a pipeline that searches the open web, reads what it finds, extracts candidate questions, grades each one by the strength of its evidence, and throws away the rest. It runs for minutes, costs real money per run, and has to produce something defensible at the end or we refund the credit.",
      "This role owns that pipeline. You will work on retrieval quality, prompt and schema design, the grading logic that decides whether a question is evidence-backed or merely inferred, the budget tracker that stops a run before it burns a customer's balance, and the job infrastructure that will move this work off the request path.",
      "Back-end leaning means the centre of gravity, not the boundary. You will still open React files, because a pipeline change that nobody can see in the report is not finished.",
    ],
    responsibilities: [
      "Own the research pipeline end to end: search, extraction, grading, caching, and the report artefact it produces.",
      "Improve output quality with evaluations rather than vibes. Build the harness if we do not have the one you need.",
      "Keep cost per run predictable: budget tracking, model selection, caching, and hard stops that fire before the money is gone.",
      "Move long-running work onto a durable queue with retries, idempotency, and cancellation that actually cancels.",
      "Design and migrate the Postgres schema, and keep migrations safe to run against production traffic.",
      "Build and maintain the credits ledger, payment webhooks, and the reconciliation that catches it when they disagree.",
      "Instrument everything. When a run degrades at two in the morning, the logs should already answer why.",
    ],
    requirements: [
      "Four or more years building backend systems in TypeScript or another strongly typed language, including operating them in production.",
      "Deep SQL and relational modelling: indexes, transactions, and what happens under concurrent writes.",
      "You have built something on top of an LLM API that had to be correct, not just impressive in a demo, and you can explain how you measured it.",
      "Practical experience with queues, retries, idempotency keys, and the failure modes of distributed work.",
      "A habit of writing tests for the paths that touch money or data integrity.",
      "Comfort in a codebase where you are also expected to change the front end when the feature needs it.",
    ],
    niceToHave: [
      "Experience with retrieval, ranking, or search relevance.",
      "You have run evaluation suites for a generative system and made a real quality call from the results.",
      "Familiarity with Drizzle, serverless Postgres and connection pooling, or Vercel's runtime model.",
      "Payments experience, especially the webhook and refund side.",
    ],
    process: [
      "Intro call, thirty minutes, with the founder.",
      "A paid take-home you can finish in a focused afternoon, built on the real stack.",
      "A ninety minute systems conversation about the pipeline and how you would change it.",
      "A final conversation about scope, money, and what the first ninety days look like.",
    ],
  },
  {
    slug: "gtm-lead",
    title: "GTM Lead",
    tagline:
      "Own how people find us and why they pay: positioning, distribution, the funnel, and the numbers underneath all three.",
    location: "Remote",
    type: "Full time",
    stack: ["Positioning", "SEO", "Lifecycle", "Analytics", "Content", "Partnerships"],
    about: [
      "We have a product that works and a story that is still too complicated. Candidates buy a report because they have a real interview in nine days and want to walk in prepared. That urgency is the whole go-to-market, and we have barely used it.",
      "This role owns everything between a stranger and a paying customer. Positioning and messaging, the landing pages, the programmatic company pages that carry our organic search, lifecycle email, pricing experiments, partnerships with bootcamps and communities, and the analytics that tell us which of those was worth doing.",
      "This is a builder's role, not a manager's. There is no team to inherit and no agency on retainer. You will write the copy, ship the page, run the experiment, and read the result yourself, and you will get an engineer's help whenever the change is genuinely technical.",
    ],
    responsibilities: [
      "Own positioning and messaging, and keep the site, the emails, and the product's own copy telling the same story.",
      "Build the acquisition engine: organic search, content, communities, partnerships, and paid where the maths supports it.",
      "Own the funnel from first visit to first purchase to repeat purchase, and improve it with real experiments.",
      "Design and run lifecycle campaigns around the moment that actually matters, which is an interview on a calendar.",
      "Run pricing and packaging experiments, and defend the conclusions with numbers.",
      "Build the reporting the whole company trusts: acquisition, activation, conversion, retention, and cost per acquisition.",
      "Talk to customers every week and bring what you hear back into the roadmap.",
    ],
    requirements: [
      "Three or more years in growth, product marketing, or go-to-market at a startup, with results you can describe in specifics.",
      "You write well and quickly, and you can hold a technical audience without sounding like a brochure.",
      "Working knowledge of SEO as it exists now, including how AI answer engines change what gets cited.",
      "You are comfortable in analytics data and can define a metric, instrument it, and query it yourself.",
      "Evidence that you have run an experiment, read an unflattering result, and changed course because of it.",
      "You are happy owning outcomes without owning headcount.",
    ],
    niceToHave: [
      "You have marketed to engineers, or to job seekers, or both.",
      "Basic technical literacy: enough HTML, SQL, and command line to stop waiting on someone else.",
      "Experience with programmatic or template-driven content at scale.",
      "A network in the careers, bootcamp, or developer community space.",
    ],
    process: [
      "Intro call, thirty minutes, with the founder.",
      "A paid exercise: a written go-to-market teardown of our current funnel.",
      "A ninety minute working session on that teardown, plus a conversation about the first two quarters.",
      "A final conversation about scope, money, and what the first ninety days look like.",
    ],
  },
];

export function getRole(slug: string): Role | undefined {
  return roles.find((role) => role.slug === slug);
}
