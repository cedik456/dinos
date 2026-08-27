CREATE TYPE "public"."account_role" AS ENUM('Coach', 'Athlete');--> statement-breakpoint
CREATE TYPE "public"."account_status" AS ENUM('pending_activation', 'active', 'disabled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."security_actor_type" AS ENUM('operator', 'account', 'system');--> statement-breakpoint
CREATE TYPE "public"."security_event_type" AS ENUM('created', 'activated', 'disabled', 'reactivated', 'cancelled');--> statement-breakpoint
CREATE TABLE "account_security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"event_type" "security_event_type" NOT NULL,
	"actor_type" "security_actor_type" NOT NULL,
	"actor_identifier" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_subject" text,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"role" "account_role" NOT NULL,
	"status" "account_status" DEFAULT 'pending_activation' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_email_canonical" CHECK ("accounts"."email" = lower(trim("accounts"."email"))),
	CONSTRAINT "accounts_subject_by_status" CHECK ((("accounts"."status" in ('active', 'disabled')) and "accounts"."auth_subject" is not null) or (("accounts"."status" in ('pending_activation', 'cancelled')) and "accounts"."auth_subject" is null)),
	CONSTRAINT "accounts_lifecycle_timestamps" CHECK (("accounts"."status" <> 'active' or "accounts"."activated_at" is not null) and ("accounts"."status" <> 'disabled' or "accounts"."disabled_at" is not null) and ("accounts"."status" <> 'cancelled' or "accounts"."cancelled_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "account_security_events" ADD CONSTRAINT "account_security_events_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_security_events_account_idx" ON "account_security_events" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_email_unique" ON "accounts" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_auth_subject_unique" ON "accounts" USING btree ("auth_subject") WHERE "accounts"."auth_subject" is not null;--> statement-breakpoint
CREATE FUNCTION prevent_account_role_change() RETURNS trigger AS $$
BEGIN
	IF NEW.role IS DISTINCT FROM OLD.role THEN
		RAISE EXCEPTION 'account role is immutable';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER accounts_role_immutable
BEFORE UPDATE OF role ON accounts
FOR EACH ROW EXECUTE FUNCTION prevent_account_role_change();
