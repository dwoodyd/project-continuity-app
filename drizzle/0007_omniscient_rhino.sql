CREATE TABLE `pattern_insights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('distraction_pattern','stall_pattern','decision_debt','capacity_mismatch','momentum_drop','cross_project_conflict','positive_pattern') NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`affectedProjectIds` json DEFAULT ('[]'),
	`severity` enum('info','warning','critical') DEFAULT 'info',
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`dismissedAt` timestamp,
	CONSTRAINT `pattern_insights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_health_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int NOT NULL,
	`score` int NOT NULL DEFAULT 50,
	`momentum` enum('rising','steady','fading','stalled') DEFAULT 'steady',
	`riskLevel` enum('low','medium','high') DEFAULT 'low',
	`completionRate` int DEFAULT 0,
	`stalledDays` int DEFAULT 0,
	`lastActivityAt` timestamp,
	`narrative` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_health_scores_id` PRIMARY KEY(`id`)
);
