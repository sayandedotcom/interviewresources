CREATE TABLE "payment_disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"provider_dispute_id" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"estimated_fee_micros" integer NOT NULL,
	"economics_version" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_disputes_provider_dispute_id_unique" UNIQUE("provider_dispute_id")
);
--> statement-breakpoint
ALTER TABLE "researches" RENAME COLUMN "cost_cents_llm" TO "cost_micros_llm";--> statement-breakpoint
ALTER TABLE "researches" RENAME COLUMN "cost_cents_search" TO "cost_micros_search";--> statement-breakpoint
UPDATE "researches"
SET
	"cost_micros_llm" = "cost_micros_llm" * 10000,
	"cost_micros_search" = "cost_micros_search" * 10000;--> statement-breakpoint
ALTER TABLE "payment_refunds" ADD COLUMN "estimated_fee_micros" integer;--> statement-breakpoint
ALTER TABLE "payment_refunds" ADD COLUMN "economics_version" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "catalog_price_usd_minor" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "estimated_dodo_fee_micros" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "economics_version" text;--> statement-breakpoint
UPDATE "payments"
SET "catalog_price_usd_minor" = CASE "pack"
	WHEN 'starter' THEN 100
	WHEN 'bundle' THEN 500
	WHEN 'max' THEN 1000
	ELSE CASE WHEN upper("currency") = 'USD' THEN "amount_minor" ELSE 0 END
END;--> statement-breakpoint
UPDATE "payments"
SET
	"estimated_dodo_fee_micros" = "catalog_price_usd_minor" * 400 + 400000,
	"economics_version" = 'legacy-1.3-pricing';--> statement-breakpoint
UPDATE "payment_refunds"
SET
	"estimated_fee_micros" = 1000000,
	"economics_version" = 'legacy-1.3-pricing';--> statement-breakpoint
ALTER TABLE "payment_refunds" ALTER COLUMN "estimated_fee_micros" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_refunds" ALTER COLUMN "economics_version" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "catalog_price_usd_minor" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "estimated_dodo_fee_micros" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "economics_version" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_disputes" ADD CONSTRAINT "payment_disputes_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;
