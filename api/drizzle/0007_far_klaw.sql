CREATE TYPE "public"."meal_recommendation_kind" AS ENUM('breakfast', 'lunch', 'snack', 'dinner', 'custom');--> statement-breakpoint
CREATE TYPE "public"."meal_recommendation_unit" AS ENUM('g', 'kg', 'ml', 'L', 'pc', 'pcs', 'tbsp', 'tsp', 'cup');--> statement-breakpoint
CREATE TABLE "meal_recommendation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"amount" numeric(10, 3) NOT NULL,
	"unit" "meal_recommendation_unit" NOT NULL,
	"position" smallint NOT NULL,
	CONSTRAINT "meal_recommendation_items_name_trimmed" CHECK (length(trim("meal_recommendation_items"."name")) between 1 and 100 and "meal_recommendation_items"."name" = trim("meal_recommendation_items"."name")),
	CONSTRAINT "meal_recommendation_items_positive_amount" CHECK ("meal_recommendation_items"."amount" > 0),
	CONSTRAINT "meal_recommendation_items_nonnegative_position" CHECK ("meal_recommendation_items"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "meal_recommendation_meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"day_offset" smallint NOT NULL,
	"kind" "meal_recommendation_kind" NOT NULL,
	"custom_name" varchar(60),
	"position" smallint NOT NULL,
	CONSTRAINT "meal_recommendation_meals_day_offset" CHECK ("meal_recommendation_meals"."day_offset" between 0 and 6),
	CONSTRAINT "meal_recommendation_meals_nonnegative_position" CHECK ("meal_recommendation_meals"."position" >= 0),
	CONSTRAINT "meal_recommendation_meals_custom_name" CHECK (("meal_recommendation_meals"."kind" = 'custom' and "meal_recommendation_meals"."custom_name" is not null and length(trim("meal_recommendation_meals"."custom_name")) between 1 and 60) or ("meal_recommendation_meals"."kind" <> 'custom' and "meal_recommendation_meals"."custom_name" is null))
);
--> statement-breakpoint
CREATE TABLE "meal_recommendation_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coaching_relationship_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meal_recommendation_plans_monday" CHECK (extract(isodow from "meal_recommendation_plans"."week_start") = 1),
	CONSTRAINT "meal_recommendation_plans_positive_version" CHECK ("meal_recommendation_plans"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "meal_recommendation_items" ADD CONSTRAINT "meal_recommendation_items_meal_id_meal_recommendation_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meal_recommendation_meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_recommendation_meals" ADD CONSTRAINT "meal_recommendation_meals_plan_id_meal_recommendation_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."meal_recommendation_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_recommendation_plans" ADD CONSTRAINT "meal_recommendation_plans_coaching_relationship_id_coaching_relationships_id_fk" FOREIGN KEY ("coaching_relationship_id") REFERENCES "public"."coaching_relationships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "meal_recommendation_items_meal_position_unique" ON "meal_recommendation_items" USING btree ("meal_id","position");--> statement-breakpoint
CREATE INDEX "meal_recommendation_items_meal_idx" ON "meal_recommendation_items" USING btree ("meal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meal_recommendation_meals_plan_day_position_unique" ON "meal_recommendation_meals" USING btree ("plan_id","day_offset","position");--> statement-breakpoint
CREATE INDEX "meal_recommendation_meals_plan_day_idx" ON "meal_recommendation_meals" USING btree ("plan_id","day_offset");--> statement-breakpoint
CREATE UNIQUE INDEX "meal_recommendation_plans_relationship_week_unique" ON "meal_recommendation_plans" USING btree ("coaching_relationship_id","week_start");--> statement-breakpoint
CREATE INDEX "meal_recommendation_plans_week_relationship_idx" ON "meal_recommendation_plans" USING btree ("week_start","coaching_relationship_id");