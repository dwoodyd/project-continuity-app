CREATE TABLE `decisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`content` text NOT NULL,
	`date` timestamp NOT NULL DEFAULT (now()),
	`source` enum('manual','extracted') NOT NULL DEFAULT 'manual',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `decisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `distraction_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`date` timestamp NOT NULL DEFAULT (now()),
	`checkInType` enum('midday','evening') NOT NULL,
	`rawInput` text NOT NULL,
	`category` enum('social_media','research_rabbit_hole','unplanned_task','communication','context_switch','unknown') NOT NULL DEFAULT 'unknown',
	`timeOfDay` enum('morning','afternoon','evening') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `distraction_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_memory_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int NOT NULL,
	`eventType` enum('created','vault_import','check_in','focus_session','milestone','blocker','next_step_change','decision','status_change') NOT NULL,
	`content` text NOT NULL,
	`metadata` text,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_memory_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_compass` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weekStart` timestamp NOT NULL,
	`primaryProjectId` int,
	`secondaryProjectId` int,
	`adminLane` text,
	`mustMove` text,
	`canWait` text,
	`shouldPark` text,
	`generatedGuidance` text,
	`userConfirmedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_compass_id` PRIMARY KEY(`id`)
);
