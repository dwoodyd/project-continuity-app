CREATE TABLE `focus_session_artifact` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`totalSegments` int NOT NULL DEFAULT 0,
	`lastUpdatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `focus_session_artifact_id` PRIMARY KEY(`id`),
	CONSTRAINT `focus_session_artifact_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `focus_sessions` MODIFY COLUMN `intention` text;--> statement-breakpoint
ALTER TABLE `focus_sessions` ADD `durationMinutes` int DEFAULT 25;--> statement-breakpoint
ALTER TABLE `focus_sessions` ADD `closingNote` text;--> statement-breakpoint
ALTER TABLE `focus_sessions` ADD `whatMoved` enum('progress','thinking','stuck');--> statement-breakpoint
ALTER TABLE `focus_sessions` ADD `threadAddedUnits` int DEFAULT 0;