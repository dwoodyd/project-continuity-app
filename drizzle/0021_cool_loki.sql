CREATE TABLE `continuity_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventType` varchar(50) NOT NULL,
	`label` varchar(255),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `continuity_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `thread_strength` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`score` int NOT NULL DEFAULT 0,
	`state` varchar(30) NOT NULL DEFAULT 'Gathering',
	`lastUpdatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `thread_strength_id` PRIMARY KEY(`id`),
	CONSTRAINT `thread_strength_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `user_milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`milestoneKey` varchar(80) NOT NULL,
	`achievedAt` timestamp NOT NULL DEFAULT (now()),
	`dismissed` boolean NOT NULL DEFAULT false,
	CONSTRAINT `user_milestones_id` PRIMARY KEY(`id`)
);
