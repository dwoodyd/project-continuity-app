CREATE TABLE `mood_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`score` int NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mood_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `project_notes` MODIFY COLUMN `content` text NOT NULL;--> statement-breakpoint
CREATE INDEX `mood_logs_user_date` ON `mood_logs` (`userId`,`date`);