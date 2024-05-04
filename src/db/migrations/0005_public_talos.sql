ALTER TABLE `watchtime` ADD `date` datetime NOT NULL;--> statement-breakpoint
ALTER TABLE `watchtime` DROP COLUMN `created_at`;--> statement-breakpoint
ALTER TABLE `watchtime` DROP COLUMN `updated_at`;