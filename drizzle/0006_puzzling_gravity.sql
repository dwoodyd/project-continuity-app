CREATE TABLE `friction_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`note` text NOT NULL,
	`pageContext` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `friction_logs_id` PRIMARY KEY(`id`)
);
