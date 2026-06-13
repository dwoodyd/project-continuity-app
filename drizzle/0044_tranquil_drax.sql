CREATE TABLE `thread_locks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`whatDoing` varchar(1000) NOT NULL,
	`whatNext` varchar(1000) NOT NULL,
	`clipboardSnippet` text,
	`nextCalendarEvent` varchar(500),
	`pagePath` varchar(500),
	`recalledAt` bigint,
	`dismissedAt` bigint,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `thread_locks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `thread_locks` ADD CONSTRAINT `thread_locks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `thread_locks` ADD CONSTRAINT `thread_locks_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;