CREATE TABLE `collapse_canaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`situation` text NOT NULL,
	`oneMove` text NOT NULL,
	`status` enum('active','complete','dismissed') NOT NULL DEFAULT 'active',
	`createdAt` bigint NOT NULL,
	`resolvedAt` bigint,
	CONSTRAINT `collapse_canaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `court_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`situation` text NOT NULL,
	`evidenceFor` text,
	`evidenceAgainst` text,
	`fairRead` text NOT NULL,
	`nextAction` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `court_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hyperfocus_exits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`focusSessionId` int,
	`stage` enum('notice','body','next','close') NOT NULL,
	`note` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `hyperfocus_exits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `if_then_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ifSituation` text NOT NULL,
	`thenAction` text NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `if_then_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `read_days` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`color` enum('gray','orange','green') NOT NULL,
	`source` enum('manual','check_in','return') NOT NULL DEFAULT 'manual',
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `read_days_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `read_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`list` enum('now','waiting','later') NOT NULL,
	`title` text NOT NULL,
	`projectId` int,
	`boundary` text,
	`status` enum('open','complete','removed') NOT NULL DEFAULT 'open',
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `read_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `threshold_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`task` text NOT NULL,
	`fork` enum('fear','activation','physical_floor','unclear') NOT NULL,
	`protection` text,
	`smallestStart` text NOT NULL,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `threshold_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `waiting_register_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` text NOT NULL,
	`waitingOn` text,
	`boundary` text,
	`followUpDate` varchar(10),
	`projectId` int,
	`status` enum('waiting','resolved','released') NOT NULL DEFAULT 'waiting',
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `waiting_register_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `captures` ADD `intent` enum('capture','note','task','idea') DEFAULT 'capture' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `calmStateReference` text;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `collapseModeEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `collapseModeUpdatedAt` bigint;--> statement-breakpoint
ALTER TABLE `collapse_canaries` ADD CONSTRAINT `collapse_canaries_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `court_entries` ADD CONSTRAINT `court_entries_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hyperfocus_exits` ADD CONSTRAINT `hyperfocus_exits_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hyperfocus_exits` ADD CONSTRAINT `hyperfocus_exits_focusSessionId_focus_sessions_id_fk` FOREIGN KEY (`focusSessionId`) REFERENCES `focus_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `if_then_plans` ADD CONSTRAINT `if_then_plans_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `read_days` ADD CONSTRAINT `read_days_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `read_items` ADD CONSTRAINT `read_items_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `read_items` ADD CONSTRAINT `read_items_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `threshold_plans` ADD CONSTRAINT `threshold_plans_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `waiting_register_items` ADD CONSTRAINT `waiting_register_items_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `waiting_register_items` ADD CONSTRAINT `waiting_register_items_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `collapse_canary_user_status_idx` ON `collapse_canaries` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `read_days_user_date_idx` ON `read_days` (`userId`,`date`);--> statement-breakpoint
CREATE INDEX `read_items_user_list_idx` ON `read_items` (`userId`,`list`,`status`);--> statement-breakpoint
CREATE INDEX `waiting_register_user_status_idx` ON `waiting_register_items` (`userId`,`status`);