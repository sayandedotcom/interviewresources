import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** better-auth's `verification` model: the value column is `value`, not `token`. */
export const verifications = pgTable("verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** PRD §9 data model. */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /**
   * The referral program lives on two nullable columns. `referralCode` is this
   * user's own share code, generated lazily the first time they open the
   * referrals page. `referredBy` is set once, at signup, to whoever's code
   * brought them in. Every reward is derived from `credits_ledger`, so these two
   * columns plus the ledger are the whole feature — no separate referrals table.
   */
  referralCode: text("referral_code").unique(),
  referredBy: uuid("referred_by").references((): AnyPgColumn => users.id, {
    onDelete: "set null",
  }),
  marketingEmailOptIn: boolean("marketing_email_opt_in").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Append-only ledger. A user's balance is SUM(delta) — grants are positive,
 * research spends negative. `paymentRef` is the idempotency key for webhook
 * grants: a redelivered Dodo payment hits the unique constraint and no-ops.
 */
export const creditsLedger = pgTable(
  "credits_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    paymentRef: text("payment_ref").unique(),
    researchId: uuid("research_id").references(() => researches.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("credits_ledger_user_id_idx").on(table.userId)]
);

export const researchStatus = ["pending", "running", "degraded", "done", "failed"] as const;

export const researches = pgTable(
  "researches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyDomain: text("company_domain"),
    companyName: text("company_name").notNull(),
    interviewers: jsonb("interviewers").$type<{ name: string; url?: string }[]>(),
    interviewType: text("interview_type").notNull(), // comma-joined categories, or "full_loop"
    roleContext: text("role_context"),
    status: text("status", { enum: researchStatus }).notNull().default("pending"),
    costCentsLlm: integer("cost_cents_llm").notNull().default(0),
    costCentsSearch: integer("cost_cents_search").notNull().default(0),
    /** Null until the run settles. Only successful runs are charged. */
    creditsCharged: integer("credits_charged"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("researches_one_running_per_user_idx")
      .on(table.userId)
      .where(sql`${table.status} = 'running'`),
  ]
);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  researchId: uuid("research_id")
    .notNull()
    .references(() => researches.id, { onDelete: "cascade" }),
  jsonPayload: jsonb("json_payload").notNull(),
  shareToken: text("share_token").unique(),
  /**
   * Set to publish a redacted version of this report at
   * `/interview-questions/<slug>` as an indexable marketing page.
   *
   * Distinct from `shareToken` in every way that matters: a share link is
   * unguessable, `noindex`, and shows the whole report to someone the owner
   * chose. This is a public, indexed, deliberately partial page — see
   * `lib/publishing/public-report.ts` for what it withholds.
   *
   * Only ever set this on reports from an account you control. Publishing a
   * customer's report would expose research they paid for, and nothing in the
   * schema can catch that mistake for you.
   */
  publishedSlug: text("published_slug").unique(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const feedbackVerdict = ["asked", "similar", "not_asked"] as const;

export const questionFeedback = pgTable(
  "question_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    questionIdx: integer("question_idx").notNull(),
    category: text("category").notNull().default("unknown"),
    confidence: text("confidence").notNull().default("unknown"),
    verdict: text("verdict", { enum: feedbackVerdict }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("question_feedback_report_question_idx").on(table.reportId, table.questionIdx),
  ]
);

export const paymentStatus = ["succeeded", "partially_refunded", "refunded"] as const;

/** Provider-backed payment facts. Credits are deliberately separate in the ledger. */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("dodo"),
    providerPaymentId: text("provider_payment_id").notNull().unique(),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull(),
    pack: text("pack").notNull(),
    creditsGranted: integer("credits_granted").notNull(),
    creditsReversed: integer("credits_reversed").notNull().default(0),
    refundedAmountMinor: integer("refunded_amount_minor").notNull().default(0),
    status: text("status", { enum: paymentStatus }).notNull().default("succeeded"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("payments_user_id_idx").on(table.userId)]
);

/** One row per provider refund makes redelivery and partial refunds idempotent. */
export const paymentRefunds = pgTable("payment_refunds", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("payment_id")
    .notNull()
    .references(() => payments.id, { onDelete: "cascade" }),
  providerRefundId: text("provider_refund_id").notNull().unique(),
  amountMinor: integer("amount_minor").notNull(),
  currency: text("currency").notNull(),
  creditsReversed: integer("credits_reversed").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productEvents = pgTable(
  "product_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    properties: jsonb("properties").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("product_events_name_created_at_idx").on(table.name, table.createdAt),
    index("product_events_user_id_idx").on(table.userId),
  ]
);

export const researchCache = pgTable("research_cache", {
  key: text("key").primaryKey(), // domain + interview_type
  stage: text("stage").notNull(),
  payload: jsonb("payload").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  researches: many(researches),
  creditsLedger: many(creditsLedger),
  payments: many(payments),
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const creditsLedgerRelations = relations(creditsLedger, ({ one }) => ({
  user: one(users, { fields: [creditsLedger.userId], references: [users.id] }),
  research: one(researches, { fields: [creditsLedger.researchId], references: [researches.id] }),
}));

export const researchesRelations = relations(researches, ({ one, many }) => ({
  user: one(users, { fields: [researches.userId], references: [users.id] }),
  reports: many(reports),
}));

export const reportsRelations = relations(reports, ({ one, many }) => ({
  research: one(researches, { fields: [reports.researchId], references: [researches.id] }),
  feedback: many(questionFeedback),
}));

export const questionFeedbackRelations = relations(questionFeedback, ({ one }) => ({
  report: one(reports, { fields: [questionFeedback.reportId], references: [reports.id] }),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  refunds: many(paymentRefunds),
}));

export const paymentRefundsRelations = relations(paymentRefunds, ({ one }) => ({
  payment: one(payments, { fields: [paymentRefunds.paymentId], references: [payments.id] }),
}));
