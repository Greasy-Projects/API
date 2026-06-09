ALTER TABLE "watchtime" ALTER COLUMN "time" SET DEFAULT 0;--> statement-breakpoint
UPDATE "watchtime" SET "time" = 0 WHERE "time" IS NULL;--> statement-breakpoint
ALTER TABLE "watchtime" ALTER COLUMN "time" SET NOT NULL;
