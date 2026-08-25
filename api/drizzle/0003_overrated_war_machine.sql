CREATE TABLE "reference_exercises" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"default_sets" smallint NOT NULL,
	"default_repetitions" varchar(32) NOT NULL,
	"instruction" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reference_exercises_default_sets_range" CHECK ("reference_exercises"."default_sets" between 1 and 20)
);
--> statement-breakpoint
CREATE TABLE "workout_template_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"reference_exercise_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"sets" smallint NOT NULL,
	"repetitions" varchar(32) NOT NULL,
	"instruction" varchar(1000),
	CONSTRAINT "workout_template_exercises_position_range" CHECK ("workout_template_exercises"."position" between 1 and 12),
	CONSTRAINT "workout_template_exercises_sets_range" CHECK ("workout_template_exercises"."sets" between 1 and 20)
);
--> statement-breakpoint
CREATE TABLE "workout_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_account_id" uuid,
	"name" varchar(100) NOT NULL,
	"overview_note" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workout_template_exercises" ADD CONSTRAINT "workout_template_exercises_template_id_workout_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workout_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_template_exercises" ADD CONSTRAINT "workout_template_exercises_reference_exercise_id_reference_exercises_id_fk" FOREIGN KEY ("reference_exercise_id") REFERENCES "public"."reference_exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_coach_account_id_accounts_id_fk" FOREIGN KEY ("coach_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reference_exercises_name_unique" ON "reference_exercises" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_template_exercises_position_unique" ON "workout_template_exercises" USING btree ("template_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_template_exercises_reference_unique" ON "workout_template_exercises" USING btree ("template_id","reference_exercise_id");--> statement-breakpoint
CREATE INDEX "workout_templates_coach_created_idx" ON "workout_templates" USING btree ("coach_account_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_templates_starter_name_unique" ON "workout_templates" USING btree ("name") WHERE "workout_templates"."coach_account_id" is null;
--> statement-breakpoint
INSERT INTO "reference_exercises" ("id", "name", "default_sets", "default_repetitions", "instruction") VALUES
	('20000000-0000-4000-8000-000000000001', 'Smith Machine Squat', 3, '8 to 10', 'Use a comfortable depth and keep each repetition controlled.'),
	('20000000-0000-4000-8000-000000000002', 'Smith Flat Bench Press', 3, '8 to 12', 'Keep your feet planted and lower the bar with control.'),
	('20000000-0000-4000-8000-000000000003', 'Cable Lat Pulldown', 3, '10 to 12', 'Drive your elbows down without leaning far back.'),
	('20000000-0000-4000-8000-000000000004', 'Dumbbell Romanian Deadlift', 2, '10 to 12', 'Push your hips back and keep the dumbbells close.'),
	('20000000-0000-4000-8000-000000000005', 'Cable Row', 2, '10 to 12', 'Finish each repetition with your shoulders down.'),
	('20000000-0000-4000-8000-000000000006', 'Cable Triceps Pushdown', 2, '12 to 15', 'Keep your elbows close to your sides.'),
	('20000000-0000-4000-8000-000000000007', 'Dumbbell Curl', 2, '12 to 15', 'Keep your upper arms quiet and avoid swinging.'),
	('20000000-0000-4000-8000-000000000008', 'Easy walking', 1, '10 to 15 minutes', 'Keep the effort conversational.')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "workout_templates" ("id", "coach_account_id", "name", "overview_note") VALUES
	('30000000-0000-4000-8000-000000000001', NULL, 'Full Body A', 'A balanced full body session for fat loss and general fitness.')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "workout_template_exercises" ("template_id", "reference_exercise_id", "position", "sets", "repetitions", "instruction") VALUES
	('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 1, 3, '8 to 10', 'Use a comfortable depth and keep each repetition controlled.'),
	('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 2, 3, '8 to 12', 'Keep your feet planted and lower the bar with control.'),
	('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 3, 3, '10 to 12', 'Drive your elbows down without leaning far back.'),
	('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', 4, 2, '10 to 12', 'Push your hips back and keep the dumbbells close.'),
	('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', 5, 2, '10 to 12', 'Finish each repetition with your shoulders down.'),
	('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000006', 6, 2, '12 to 15', 'Keep your elbows close to your sides.'),
	('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000007', 7, 2, '12 to 15', 'Keep your upper arms quiet and avoid swinging.'),
	('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000008', 8, 1, '10 to 15 minutes', 'Keep the effort conversational.')
ON CONFLICT DO NOTHING;
