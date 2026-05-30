CREATE TABLE `app_config` (
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `app_config_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `ground_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`enteredAt` bigint NOT NULL,
	`entryMethod` enum('manual','contextual_offer') NOT NULL,
	`exitedAt` bigint,
	`exitMethod` enum('manual','soft_expire','crisis_break','session_end'),
	`durationMs` int,
	CONSTRAINT `ground_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ground_sessions` ADD CONSTRAINT `ground_sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;