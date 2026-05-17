CREATE TABLE `user_focus_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`focusTopic` text NOT NULL,
	`durationDays` int NOT NULL,
	`cadence` enum('daily','weekday','rhythm') NOT NULL DEFAULT 'daily',
	`wrenPrompts` boolean NOT NULL DEFAULT false,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	`pausedUntil` timestamp,
	`status` enum('active','paused','ended','completed') NOT NULL DEFAULT 'active',
	`entriesCount` int NOT NULL DEFAULT 0,
	`currentStreak` int NOT NULL DEFAULT 0,
	`longestStreak` int NOT NULL DEFAULT 0,
	`lastEntryDate` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_focus_configs_id` PRIMARY KEY(`id`)
);
