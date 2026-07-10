import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
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
  referredBy: uuid("referred_by").references((): AnyPgColumn => users.id),
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
      .references(() => users.id),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    paymentRef: text("payment_ref").unique(),
    researchId: uuid("research_id").references(() => researches.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("credits_ledger_user_id_idx").on(table.userId)]
);

export const researchStatus = ["pending", "running", "degraded", "done", "failed"] as const;

export const researches = pgTable("researches", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
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
});

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  researchId: uuid("research_id")
    .notNull()
    .references(() => researches.id),
  jsonPayload: jsonb("json_payload").notNull(),
  shareToken: text("share_token").unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const feedbackVerdict = ["asked", "similar", "not_asked"] as const;

export const questionFeedback = pgTable("question_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportId: uuid("report_id")
    .notNull()
    .references(() => reports.id),
  questionIdx: integer("question_idx").notNull(),
  verdict: text("verdict", { enum: feedbackVerdict }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const researchCache = pgTable("research_cache", {
  key: text("key").primaryKey(), // domain + interview_type
  stage: text("stage").notNull(),
  payload: jsonb("payload").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  researches: many(researches),
  creditsLedger: many(creditsLedger),
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
