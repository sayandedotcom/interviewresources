CREATE TABLE "job_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_slug" text NOT NULL,
	"role_title" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"consent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "job_applications_role_slug_created_at_idx" ON "job_applications" USING btree ("role_slug","created_at");--> statement-breakpoint
CREATE INDEX "job_applications_email_idx" ON "job_applications" USING btree ("email");