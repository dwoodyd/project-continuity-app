CREATE TABLE `booked_focus_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`intention` text,
	`durationMinutes` int NOT NULL,
	`scheduledFor` timestamp NOT NULL,
	`status` enum('scheduled','cancelled','started') NOT NULL DEFAULT 'scheduled',
	`reminderSentAt` timestamp,
	`cancelledAt` timestamp,
	`startedAt` timestamp,
	`focusSessionId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `booked_focus_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `booked_focus_sessions_due_idx` ON `booked_focus_sessions` (`status`,`scheduledFor`);--> statement-breakpoint
CREATE INDEX `booked_focus_sessions_user_idx` ON `booked_focus_sessions` (`userId`,`status`,`scheduledFor`);