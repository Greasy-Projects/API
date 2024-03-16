ALTER TABLE `users` MODIFY COLUMN `scope` varchar(255) DEFAULT 'group:default';--> statement-breakpoint
ALTER TABLE `user_accounts` MODIFY COLUMN `email` varchar(255);--> statement-breakpoint
ALTER TABLE `user_accounts` MODIFY COLUMN `avatar` varchar(255);--> statement-breakpoint
ALTER TABLE `user_accounts` MODIFY COLUMN `user_id` varchar(100);--> statement-breakpoint
ALTER TABLE `user_accounts` MODIFY COLUMN `access_token` varchar(100);--> statement-breakpoint
ALTER TABLE `user_accounts` MODIFY COLUMN `refresh_token` varchar(100);
