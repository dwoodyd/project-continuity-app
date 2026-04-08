CREATE TABLE `feedbackSubmissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` enum('bug','suggestion','question','other') NOT NULL DEFAULT 'other',
	`message` text NOT NULL,
	`deviceInfo` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedbackSubmissions_id` PRIMARY KEY(`id`)
);
