CREATE TABLE `evidence_log_summaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`month` varchar(7) NOT NULL,
	`sessionsStarted` int NOT NULL DEFAULT 0,
	`returnsAfterGap` int NOT NULL DEFAULT 0,
	`hardDaySessions` int NOT NULL DEFAULT 0,
	`genuinePermissions` int NOT NULL DEFAULT 0,
	`summaryLine` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidence_log_summaries_id` PRIMARY KEY(`id`)
);
