CREATE TABLE IF NOT EXISTS "user_accounts" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"email" varchar(255),
	"avatar" varchar(255),
	"user_id" varchar(100),
	"platform" varchar(255) NOT NULL,
	"scope" varchar(255) NOT NULL,
	"access_token" varchar(100) NOT NULL,
	"refresh_token" varchar(100) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "minecraft_users" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(100) NOT NULL,
	"whitelisted" boolean DEFAULT true,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "minecraft_users_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"user_id" varchar(100) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"scope" varchar(255) DEFAULT 'group:default',
	"primary_account_id" varchar(100) NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "users_primary_account_id_unique" UNIQUE("primary_account_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "watchtime" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"twitch_id" varchar(100) NOT NULL,
	"time" integer,
	"date" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "watchtime_twitch_id_date_unique" UNIQUE("twitch_id","date")
);
--> statement-breakpoint
ALTER TABLE "user_accounts" ALTER COLUMN "platform" TYPE varchar(255) USING "platform"::varchar(255);--> statement-breakpoint
ALTER TABLE "minecraft_users" ALTER COLUMN "whitelisted" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "minecraft_users" ALTER COLUMN "whitelisted" TYPE boolean USING "whitelisted"::text IN ('1', 'true', 't');--> statement-breakpoint
ALTER TABLE "minecraft_users" ALTER COLUMN "whitelisted" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "watchtime" ALTER COLUMN "id" TYPE varchar(100) USING "id"::text;--> statement-breakpoint
UPDATE "watchtime" SET "updated_at" = now() WHERE "updated_at" IS NULL;--> statement-breakpoint
ALTER TABLE "watchtime" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE restrict;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "minecraft_users" ADD CONSTRAINT "minecraft_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "users" ADD CONSTRAINT "users_primary_account_id_user_accounts_id_fk" FOREIGN KEY ("primary_account_id") REFERENCES "public"."user_accounts"("id") ON DELETE cascade ON UPDATE restrict;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "watchtime" ADD CONSTRAINT "watchtime_twitch_id_date_unique" UNIQUE("twitch_id","date");
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
