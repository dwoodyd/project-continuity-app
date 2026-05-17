CREATE TABLE `coworking_rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(32) NOT NULL,
	`description` text,
	`maxParticipants` int NOT NULL DEFAULT 8,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coworking_rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `coworking_rooms_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `coworking_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`roomId` int NOT NULL,
	`workingOn` text,
	`status` enum('working','stuck','done') NOT NULL DEFAULT 'working',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`leftAt` timestamp,
	`durationMinutes` int,
	`aiNextStep` text,
	`projectId` int,
	CONSTRAINT `coworking_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `coworking_sessions` ADD CONSTRAINT `coworking_sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coworking_sessions` ADD CONSTRAINT `coworking_sessions_roomId_coworking_rooms_id_fk` FOREIGN KEY (`roomId`) REFERENCES `coworking_rooms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coworking_sessions` ADD CONSTRAINT `coworking_sessions_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;