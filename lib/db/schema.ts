import { relations } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
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

export const verificationTokens = pgTable("verification_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** PRD §9 data model. Not yet wired to the app — schema-only for now. */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const creditsLedger = pgTable("credits_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  stripeRef: text("stripe_ref"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const researchStatus = ["pending", "running", "degraded", "done", "failed"] as const;

export const researches = pgTable("researches", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  companyDomain: text("company_domain"),
  companyName: text("company_name").notNull(),
  interviewerName: text("interviewer_name"),
  interviewerUrl: text("interviewer_url"),
  interviewType: text("interview_type").notNull(), // comma-joined categories, or "full_loop"
  roleContext: text("role_context"),
  status: text("status", { enum: researchStatus }).notNull().default("pending"),
  costCentsLlm: integer("cost_cents_llm").notNull().default(0),
  costCentsSearch: integer("cost_cents_search").notNull().default(0),
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
