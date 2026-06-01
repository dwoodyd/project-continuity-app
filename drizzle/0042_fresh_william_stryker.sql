CREATE TABLE `surface_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` int,
	`elapsedSeconds` int NOT NULL,
	`trigger` enum('interval','approaching_hard_stop','divergence') NOT NULL,
	`userResponse` enum('dismissed','took_break','ended_session'),
	`createdAt` bigint NOT NULL,
	CONSTRAINT `surface_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_estimates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`taskTitle` varchar(500) NOT NULL,
	`estimateMinutes` int,
	`actualMinutes` int,
	`sessionId` int,
	`completedAt` bigint,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `task_estimates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `unstick_invocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`taskId` varchar(100),
	`taskTitle` varchar(500),
	`decompositionDepth` int NOT NULL DEFAULT 0,
	`launchedTimebox` int NOT NULL DEFAULT 0,
	`launchedBodyDoubling` int NOT NULL DEFAULT 0,
	`entryMethod` enum('manual','resolver_offer') NOT NULL,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `unstick_invocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `focus_sessions` ADD `hardStop` bigint;--> statement-breakpoint
ALTER TABLE `surface_events` ADD CONSTRAINT `surface_events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_estimates` ADD CONSTRAINT `task_estimates_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_estimates` ADD CONSTRAINT `task_estimates_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `unstick_invocations` ADD CONSTRAINT `unstick_invocations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;