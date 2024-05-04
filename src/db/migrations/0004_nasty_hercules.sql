CREATE TABLE `watchtime` (
	`id` varchar(100) NOT NULL,
	`twitch_id` varchar(100) NOT NULL,
	`time` int,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `watchtime_id` PRIMARY KEY(`id`)
);
