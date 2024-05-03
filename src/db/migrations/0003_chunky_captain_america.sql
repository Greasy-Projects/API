ALTER TABLE `user_accounts` MODIFY COLUMN `access_token` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `user_accounts` MODIFY COLUMN `refresh_token` varchar(100) NOT NULL;