CREATE TABLE `notification_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('morning','midday','evening','cold_project','sanctuary') NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`projectId` int,
	`suppressedBy` varchar(64),
	CONSTRAINT `notification_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `morningNotifEnabled` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `middayNotifEnabled` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `eveningNotifEnabled` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `coldProjectNotifEnabled` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `sanctuaryNotifEnabled` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `notifMessageRotation` text;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `workStyle` enum('writing_creative','business_product','ministry_coaching','consulting_client','multiple');--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `preferredFocusHours` enum('morning','midday','afternoon','evening','varies') DEFAULT 'morning';