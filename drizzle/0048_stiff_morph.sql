CREATE TABLE `crisis_flags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`riskLevel` enum('elevated','acute') NOT NULL,
	`surfaceName` varchar(64) NOT NULL,
	`flaggedAt` bigint NOT NULL,
	CONSTRAINT `crisis_flags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `wrenGentleDirect` int DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `wrenBriefThorough` int DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `wrenCalmEnergizing` int DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `wrenFollowsChallenges` int DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `wrenDefaultMode` enum('doing','reflecting','grounding') DEFAULT 'reflecting' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `wrenMemoryPaused` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `crisis_flags` ADD CONSTRAINT `crisis_flags_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;