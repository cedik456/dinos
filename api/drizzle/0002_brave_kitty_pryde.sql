CREATE TYPE "public"."coaching_relationship_status" AS ENUM('active', 'ended');--> statement-breakpoint
CREATE TYPE "public"."roster_invitation_status" AS ENUM('sending', 'pending', 'failed', 'accepted', 'revoked', 'expired');--> statement-breakpoint
CREATE TABLE "coaching_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_account_id" uuid NOT NULL,
	"athlete_account_id" uuid NOT NULL,
	"source_invitation_id" uuid NOT NULL,
	"status" "coaching_relationship_status" DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coaching_relationships_source_invitation_id_unique" UNIQUE("source_invitation_id"),
	CONSTRAINT "coaching_relationships_distinct_accounts" CHECK ("coaching_relationships"."coach_account_id" <> "coaching_relationships"."athlete_account_id"),
	CONSTRAINT "coaching_relationships_lifecycle_fields" CHECK (("coaching_relationships"."status" <> 'ended' or "coaching_relationships"."ended_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "roster_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_account_id" uuid NOT NULL,
	"invited_email" text NOT NULL,
	"athlete_account_id" uuid,
	"clerk_invitation_id" text,
	"status" "roster_invitation_status" DEFAULT 'sending' NOT NULL,
	"expires_at" timestamp with time zone,
	"adult_confirmed_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roster_invitations_email_canonical" CHECK ("roster_invitations"."invited_email" = lower(trim("roster_invitations"."invited_email"))),
	CONSTRAINT "roster_invitations_lifecycle_fields" CHECK (("roster_invitations"."status" <> 'accepted' or ("roster_invitations"."athlete_account_id" is not null and "roster_invitations"."adult_confirmed_at" is not null and "roster_invitations"."accepted_at" is not null)) and ("roster_invitations"."status" <> 'revoked' or "roster_invitations"."revoked_at" is not null) and ("roster_invitations"."status" <> 'pending' or ("roster_invitations"."clerk_invitation_id" is not null and "roster_invitations"."expires_at" is not null)))
);
--> statement-breakpoint
ALTER TABLE "coaching_relationships" ADD CONSTRAINT "coaching_relationships_coach_account_id_accounts_id_fk" FOREIGN KEY ("coach_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_relationships" ADD CONSTRAINT "coaching_relationships_athlete_account_id_accounts_id_fk" FOREIGN KEY ("athlete_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_relationships" ADD CONSTRAINT "coaching_relationships_source_invitation_id_roster_invitations_id_fk" FOREIGN KEY ("source_invitation_id") REFERENCES "public"."roster_invitations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_invitations" ADD CONSTRAINT "roster_invitations_coach_account_id_accounts_id_fk" FOREIGN KEY ("coach_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_invitations" ADD CONSTRAINT "roster_invitations_athlete_account_id_accounts_id_fk" FOREIGN KEY ("athlete_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coaching_relationships_active_athlete_unique" ON "coaching_relationships" USING btree ("athlete_account_id") WHERE "coaching_relationships"."status" = 'active';--> statement-breakpoint
CREATE INDEX "coaching_relationships_coach_started_idx" ON "coaching_relationships" USING btree ("coach_account_id","started_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "roster_invitations_clerk_id_unique" ON "roster_invitations" USING btree ("clerk_invitation_id") WHERE "roster_invitations"."clerk_invitation_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "roster_invitations_open_email_unique" ON "roster_invitations" USING btree ("invited_email") WHERE "roster_invitations"."status" in ('sending', 'pending', 'failed');--> statement-breakpoint
CREATE INDEX "roster_invitations_coach_created_idx" ON "roster_invitations" USING btree ("coach_account_id","created_at","id");