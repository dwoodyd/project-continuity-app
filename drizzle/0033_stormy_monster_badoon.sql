CREATE TABLE `founding_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`relationship` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`inviteCodeSent` varchar(32),
	`approvedAt` bigint,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `founding_applications_id` PRIMARY KEY(`id`)
);
