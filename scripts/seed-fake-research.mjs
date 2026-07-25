import "dotenv/config";
import postgres from "postgres";

const EMAIL = process.argv[2];
if (!EMAIL) {
  console.error("Usage: node scripts/seed-fake-research.mjs <email>");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

const fakeReport = {
  companySnapshot:
    "Stripe is a financial infrastructure platform for internet businesses, processing payments at massive scale across 40+ countries. Known for a strong API-design culture and a heavily distributed systems stack (mostly Ruby, Scala, and Go services).",
  companyExplainer:
    "Stripe helps businesses take payments on the internet. When you buy shoes online and type in your card number, Stripe is the service behind the scenes that checks the card is real and moves the money from your bank to the store's bank.",
  likelyLoopStructure:
    "Recruiter screen (30m) → Technical phone screen (DSA, 45m) → Onsite loop: System Design (60m), Domain/Coding round (60m), Behavioral (45m), Bar-raiser (45m).",
  interviewerSummary: null,
  questions: [
    {
      category: "dsa",
      question: "Design a rate limiter that can handle burst traffic across distributed nodes.",
      confidence: "high",
      rationale:
        "Stripe's API gateway problems come up repeatedly in recent interview reports for backend roles.",
      prepNote:
        "Cover token bucket vs sliding window, then discuss coordination via Redis and clock skew issues in a distributed setting.",
      evidenceUrls: ["https://example.com/glassdoor-stripe-interview"],
    },
    {
      category: "system_design",
      question: "Design an idempotent payment processing system that avoids double charges.",
      confidence: "high",
      rationale:
        "Directly maps to Stripe's core product surface — idempotency keys are a documented part of their public API.",
      prepNote:
        "Discuss idempotency keys, exactly-once semantics via dedupe tables, and reconciliation jobs for partial failures.",
      evidenceUrls: ["https://example.com/stripe-eng-blog"],
    },
    {
      category: "behavioral",
      question:
        "Tell me about a time you had to push back on a product requirement for technical reasons.",
      confidence: "medium",
      rationale:
        "Common behavioral prompt pattern seen across fintech companies with strong engineering culture.",
      prepNote:
        "Use a STAR structure; emphasize collaborative pushback, not unilateral technical vetoes.",
      evidenceUrls: [],
    },
  ],
  prepPlan: [
    "Review Stripe's public API docs, particularly idempotency and webhooks.",
    "Practice 2-3 distributed rate limiter / dedupe system design problems.",
    "Prepare 3 STAR stories: a technical disagreement, a production incident, and a cross-team project.",
  ],
  importantLinks: [
    {
      title: "Stripe API Documentation — Idempotent Requests",
      url: "https://example.com/stripe-idempotency-docs",
      why: "Directly informs the most likely system design prompt.",
    },
    {
      title: "Stripe Engineering Blog",
      url: "https://example.com/stripe-eng-blog",
      why: "Gives you real vocabulary and architecture patterns to reference in interviews.",
    },
  ],
};

const [user] = await sql`select id from users where email = ${EMAIL} limit 1`;
if (!user) {
  console.error(`No user found with email ${EMAIL}`);
  process.exit(1);
}

const [research] = await sql`
  insert into researches (user_id, company_name, interview_type, status, cost_micros_llm, cost_micros_search, credits_charged)
  values (${user.id}, 'Stripe (fake preview)', 'dsa,system_design,behavioral', 'done', 120000, 40000, 46)
  returning id
`;

await sql`
  insert into reports (research_id, json_payload)
  values (${research.id}, ${sql.json(fakeReport)})
`;

console.log(`Fake session created: /prepare/${research.id}`);
await sql.end();
