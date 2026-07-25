CREATE TABLE "payment_refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"provider_refund_id" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"credits_reversed" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_refunds_provider_refund_id_unique" UNIQUE("provider_refund_id")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text DEFAULT 'dodo' NOT NULL,
	"provider_payment_id" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"pack" text NOT NULL,
	"credits_granted" integer NOT NULL,
	"credits_reversed" integer DEFAULT 0 NOT NULL,
	"refunded_amount_minor" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'succeeded' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_provider_payment_id_unique" UNIQUE("provider_payment_id")
);
--> statement-breakpoint
CREATE TABLE "product_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credits_ledger" DROP CONSTRAINT "credits_ledger_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "credits_ledger" DROP CONSTRAINT "credits_ledger_research_id_researches_id_fk";
--> statement-breakpoint
ALTER TABLE "question_feedback" DROP CONSTRAINT "question_feedback_report_id_reports_id_fk";
--> statement-breakpoint
ALTER TABLE "reports" DROP CONSTRAINT "reports_research_id_researches_id_fk";
--> statement-breakpoint
ALTER TABLE "researches" DROP CONSTRAINT "researches_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_referred_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "question_feedback" ADD COLUMN "category" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "question_feedback" ADD COLUMN "confidence" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "question_feedback" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "marketing_email_opt_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_events" ADD CONSTRAINT "product_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_user_id_idx" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "product_events_name_created_at_idx" ON "product_events" USING btree ("name","created_at");--> statement-breakpoint
CREATE INDEX "product_events_user_id_idx" ON "product_events" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "credits_ledger" ADD CONSTRAINT "credits_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credits_ledger" ADD CONSTRAINT "credits_ledger_research_id_researches_id_fk" FOREIGN KEY ("research_id") REFERENCES "public"."researches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_feedback" ADD CONSTRAINT "question_feedback_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_research_id_researches_id_fk" FOREIGN KEY ("research_id") REFERENCES "public"."researches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "researches" ADD CONSTRAINT "researches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_users_id_fk" FOREIGN KEY ("referred_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
DELETE FROM "question_feedback" newer
USING "question_feedback" older
WHERE newer."report_id" = older."report_id"
  AND newer."question_idx" = older."question_idx"
  AND (newer."created_at", newer."id") < (older."created_at", older."id");--> statement-breakpoint
UPDATE "researches" AS stale
SET "status" = 'failed'
WHERE stale."status" = 'running'
  AND EXISTS (
    SELECT 1
    FROM "researches" AS newer
    WHERE newer."user_id" = stale."user_id"
      AND newer."status" = 'running'
      AND (newer."created_at", newer."id") > (stale."created_at", stale."id")
  );--> statement-breakpoint
CREATE UNIQUE INDEX "question_feedback_report_question_idx" ON "question_feedback" USING btree ("report_id","question_idx");--> statement-breakpoint
CREATE UNIQUE INDEX "researches_one_running_per_user_idx" ON "researches" USING btree ("user_id") WHERE "researches"."status" = 'running';
