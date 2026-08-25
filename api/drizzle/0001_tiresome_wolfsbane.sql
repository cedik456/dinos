CREATE TYPE "public"."workout_assignment_status" AS ENUM('assigned', 'completed', 'reviewed');--> statement-breakpoint
CREATE TABLE "assignment_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"name" varchar(100) NOT NULL,
	"sets" smallint NOT NULL,
	"repetitions" varchar(32) NOT NULL,
	"instruction" varchar(1000),
	CONSTRAINT "assignment_exercises_position_range" CHECK ("assignment_exercises"."position" between 1 and 12),
	CONSTRAINT "assignment_exercises_sets_range" CHECK ("assignment_exercises"."sets" between 1 and 20)
);
--> statement-breakpoint
CREATE TABLE "workout_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_account_id" uuid NOT NULL,
	"athlete_account_id" uuid NOT NULL,
	"title" varchar(100) NOT NULL,
	"overview_note" varchar(1000),
	"assigned_date" date NOT NULL,
	"creation_time_zone" varchar(64) NOT NULL,
	"status" "workout_assignment_status" DEFAULT 'assigned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_assignments_distinct_actors" CHECK ("workout_assignments"."coach_account_id" <> "workout_assignments"."athlete_account_id")
);
--> statement-breakpoint
CREATE TABLE "workout_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"athlete_account_id" uuid NOT NULL,
	"note" varchar(1000),
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_completions_assignment_id_unique" UNIQUE("assignment_id")
);
--> statement-breakpoint
CREATE TABLE "workout_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"coach_account_id" uuid NOT NULL,
	"response" varchar(1000),
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_reviews_assignment_id_unique" UNIQUE("assignment_id")
);
--> statement-breakpoint
ALTER TABLE "assignment_exercises" ADD CONSTRAINT "assignment_exercises_assignment_id_workout_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."workout_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_assignments" ADD CONSTRAINT "workout_assignments_coach_account_id_accounts_id_fk" FOREIGN KEY ("coach_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_assignments" ADD CONSTRAINT "workout_assignments_athlete_account_id_accounts_id_fk" FOREIGN KEY ("athlete_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_completions" ADD CONSTRAINT "workout_completions_assignment_id_workout_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."workout_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_completions" ADD CONSTRAINT "workout_completions_athlete_account_id_accounts_id_fk" FOREIGN KEY ("athlete_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_reviews" ADD CONSTRAINT "workout_reviews_assignment_id_workout_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."workout_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_reviews" ADD CONSTRAINT "workout_reviews_coach_account_id_accounts_id_fk" FOREIGN KEY ("coach_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_exercises_assignment_position_unique" ON "assignment_exercises" USING btree ("assignment_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_assignments_athlete_date_unique" ON "workout_assignments" USING btree ("athlete_account_id","assigned_date");--> statement-breakpoint
CREATE INDEX "workout_assignments_coach_date_idx" ON "workout_assignments" USING btree ("coach_account_id","assigned_date","created_at","id");--> statement-breakpoint
CREATE INDEX "workout_assignments_athlete_date_idx" ON "workout_assignments" USING btree ("athlete_account_id","assigned_date","created_at","id");--> statement-breakpoint
CREATE INDEX "workout_assignments_coach_status_date_idx" ON "workout_assignments" USING btree ("coach_account_id","status","assigned_date","created_at","id");--> statement-breakpoint
CREATE INDEX "workout_assignments_athlete_status_date_idx" ON "workout_assignments" USING btree ("athlete_account_id","status","assigned_date","created_at","id");--> statement-breakpoint
CREATE INDEX "workout_completions_completed_assignment_idx" ON "workout_completions" USING btree ("completed_at","assignment_id");