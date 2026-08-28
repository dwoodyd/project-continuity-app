CREATE TABLE `llm_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`endpoint` varchar(128) NOT NULL,
	`model` varchar(128) NOT NULL,
	`inputTokens` int NOT NULL DEFAULT 0,
	`outputTokens` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `llm_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `llm_usage_user_created_idx` ON `llm_usage` (`userId`,`createdAt`);