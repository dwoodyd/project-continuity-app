CREATE TABLE `capture_atoms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`captureId` int NOT NULL,
	`userId` int NOT NULL,
	`kind` enum('fact','task','open_loop','question','insight') NOT NULL,
	`text` text NOT NULL,
	`salience` float NOT NULL DEFAULT 0.5,
	`userCorrected` tinyint NOT NULL DEFAULT 0,
	`routedTo` enum('unstick','loops'),
	`routedTargetId` int,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `capture_atoms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `captures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mode` enum('voice','text') NOT NULL,
	`durationS` int,
	`audioKey` varchar(1000),
	`transcript` text NOT NULL,
	`processingState` enum('raw','sorted') NOT NULL DEFAULT 'raw',
	`duringFocusSessionId` int,
	`groundModeOfferedAt` bigint,
	`deletedAt` bigint,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `captures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `open_loops` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`atomId` int,
	`text` text NOT NULL,
	`status` enum('open','closed') NOT NULL DEFAULT 'open',
	`openedAt` bigint NOT NULL,
	`closedAt` bigint,
	`resurfaceAt` bigint,
	CONSTRAINT `open_loops_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sort_corrections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`text` text NOT NULL,
	`fromKind` enum('feeling','fact','task','open_loop','question','insight') NOT NULL,
	`toKind` enum('feeling','fact','task','open_loop','question','insight') NOT NULL,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `sort_corrections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `capture_atoms` ADD CONSTRAINT `capture_atoms_captureId_captures_id_fk` FOREIGN KEY (`captureId`) REFERENCES `captures`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `capture_atoms` ADD CONSTRAINT `capture_atoms_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `captures` ADD CONSTRAINT `captures_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `open_loops` ADD CONSTRAINT `open_loops_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sort_corrections` ADD CONSTRAINT `sort_corrections_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;