CREATE TABLE `minecraft_users` (
	`minecraft_uuid` varchar(36) NOT NULL,
	`user_id` varchar(100) NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `minecraft_users_minecraft_uuid` PRIMARY KEY(`minecraft_uuid`),
	CONSTRAINT `minecraft_users_minecraft_uuid_unique` UNIQUE(`minecraft_uuid`)
);
--> statement-breakpoint
ALTER TABLE `sessions` DROP FOREIGN KEY `sessions_user_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `minecraft_users` ADD CONSTRAINT `minecraft_users_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;