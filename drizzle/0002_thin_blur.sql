CREATE TABLE `focus_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`intention` text NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`durationSeconds` int NOT NULL DEFAULT 0,
	`completedAt` timestamp,
	`notes` text,
	`wasCompleted` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `focus_sessions_id` PRIMARY KEY(`id`)
);
