CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
DO $$ BEGIN
	IF (
		SELECT data_type
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'watchtime'
			AND column_name = 'id'
	) <> 'uuid' THEN
		ALTER TABLE "watchtime" ALTER COLUMN "id" DROP DEFAULT;
		ALTER TABLE "watchtime" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "watchtime" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
