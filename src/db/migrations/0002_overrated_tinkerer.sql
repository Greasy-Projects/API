CREATE TABLE `minecraft_users` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(100) NOT NULL,
	`whitelisted` boolean DEFAULT true,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `minecraft_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `minecraft_users_id_unique` UNIQUE(`id`)
);
--> statement-breakpoint
ALTER TABLE `minecraft_users` ADD CONSTRAINT `minecraft_users_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;