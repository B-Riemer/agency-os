CREATE TYPE "public"."sovereignty_level" AS ENUM('eu_only', 'eu_plus', 'global', 'global_pii');--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "sovereignty" "sovereignty_level" DEFAULT 'eu_plus' NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "budget_fallback" boolean DEFAULT false NOT NULL;