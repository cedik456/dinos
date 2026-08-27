CREATE TYPE "public"."exercise_video_provider" AS ENUM('youtube', 'vimeo');--> statement-breakpoint
CREATE TYPE "public"."reference_exercise_catalog_status" AS ENUM('active', 'unavailable');--> statement-breakpoint
CREATE TABLE "coach_exercise_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_account_id" uuid NOT NULL,
	"reference_exercise_id" uuid NOT NULL,
	"provider" "exercise_video_provider" NOT NULL,
	"provider_video_id" varchar(128) NOT NULL,
	"canonical_source_url" varchar(500) NOT NULL,
	"creator_name" varchar(100) NOT NULL,
	"sharing_confirmed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignment_exercises" ADD COLUMN "reference_exercise_id" uuid;--> statement-breakpoint
ALTER TABLE "assignment_exercises" ADD COLUMN "illustration_frames" jsonb;--> statement-breakpoint
ALTER TABLE "assignment_exercises" ADD COLUMN "illustration_attribution" jsonb;--> statement-breakpoint
ALTER TABLE "assignment_exercises" ADD COLUMN "video_provider" "exercise_video_provider";--> statement-breakpoint
ALTER TABLE "assignment_exercises" ADD COLUMN "video_provider_id" varchar(128);--> statement-breakpoint
ALTER TABLE "assignment_exercises" ADD COLUMN "video_creator_name" varchar(100);--> statement-breakpoint
ALTER TABLE "assignment_exercises" ADD COLUMN "video_source_url" varchar(500);--> statement-breakpoint
ALTER TABLE "reference_exercises" ADD COLUMN "catalog_source" varchar(100);--> statement-breakpoint
ALTER TABLE "reference_exercises" ADD COLUMN "catalog_version" varchar(32);--> statement-breakpoint
ALTER TABLE "reference_exercises" ADD COLUMN "catalog_slug" varchar(160);--> statement-breakpoint
ALTER TABLE "reference_exercises" ADD COLUMN "catalog_status" "reference_exercise_catalog_status" DEFAULT 'unavailable' NOT NULL;--> statement-breakpoint
ALTER TABLE "reference_exercises" ADD COLUMN "exercise_type" varchar(64);--> statement-breakpoint
ALTER TABLE "reference_exercises" ADD COLUMN "equipment" varchar(100);--> statement-breakpoint
ALTER TABLE "reference_exercises" ADD COLUMN "primary_muscle" varchar(100);--> statement-breakpoint
ALTER TABLE "reference_exercises" ADD COLUMN "secondary_muscles" jsonb;--> statement-breakpoint
ALTER TABLE "reference_exercises" ADD COLUMN "is_stretch" boolean;--> statement-breakpoint
ALTER TABLE "reference_exercises" ADD COLUMN "illustration_frames" jsonb;--> statement-breakpoint
ALTER TABLE "reference_exercises" ADD COLUMN "illustration_attribution" jsonb;--> statement-breakpoint
ALTER TABLE "coach_exercise_videos" ADD CONSTRAINT "coach_exercise_videos_coach_account_id_accounts_id_fk" FOREIGN KEY ("coach_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_exercise_videos" ADD CONSTRAINT "coach_exercise_videos_reference_exercise_id_reference_exercises_id_fk" FOREIGN KEY ("reference_exercise_id") REFERENCES "public"."reference_exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coach_exercise_videos_owner_reference_unique" ON "coach_exercise_videos" USING btree ("coach_account_id","reference_exercise_id");--> statement-breakpoint
ALTER TABLE "assignment_exercises" ADD CONSTRAINT "assignment_exercises_reference_exercise_id_reference_exercises_id_fk" FOREIGN KEY ("reference_exercise_id") REFERENCES "public"."reference_exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reference_exercises_source_slug_unique" ON "reference_exercises" USING btree ("catalog_source","catalog_slug") WHERE "reference_exercises"."catalog_source" is not null and "reference_exercises"."catalog_slug" is not null;--> statement-breakpoint
CREATE INDEX "reference_exercises_catalog_filter_idx" ON "reference_exercises" USING btree ("catalog_status","equipment","primary_muscle","name");