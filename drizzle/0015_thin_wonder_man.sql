CREATE TABLE `study_day_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`dayNum` int NOT NULL,
	`logDate` varchar(10),
	`capacity` varchar(20),
	`firstMove` text,
	`whatLearned` text,
	`whatBuilt` text,
	`stayedOnLesson` varchar(20),
	`driftedWhere` text,
	`returnStep` text,
	`whatMoved` text,
	`stillFuzzy` text,
	`summary` text,
	`carryForward` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `study_day_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `study_focus_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`logDate` varchar(10) NOT NULL,
	`startTime` varchar(10),
	`duration` varchar(30),
	`capacity` varchar(20),
	`lesson` text,
	`tinyProject` text,
	`intention` text,
	`actualWork` text,
	`drifted` varchar(20),
	`driftedWhere` text,
	`returnPoint` text,
	`whatMoved` text,
	`nextStep` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `study_focus_blocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `study_weekly_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weekNum` int NOT NULL,
	`meaningfulMovement` text,
	`lessonsCompleted` text,
	`buildsCompleted` text,
	`stillFuzzy` text,
	`driftedMost` text,
	`whatHelped` text,
	`newUnderstanding` text,
	`openLoop` text,
	`startHereNext` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `study_weekly_reviews_id` PRIMARY KEY(`id`)
);
