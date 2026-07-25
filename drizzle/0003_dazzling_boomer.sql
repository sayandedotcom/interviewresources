ALTER TABLE "reports" ADD COLUMN "published_slug" text;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "published_at" timestamp;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_published_slug_unique" UNIQUE("published_slug");