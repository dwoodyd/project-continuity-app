CREATE TABLE `first_movable_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`avoidedTask` text NOT NULL,
	`theMove` text NOT NULL,
	`whereItEnds` varchar(255) NOT NULL,
	`isTooHeavy` boolean NOT NULL DEFAULT false,
	`minimumViableContact` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`usedAt` timestamp,
	CONSTRAINT `first_movable_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `threshold_diagnoses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`taskDescription` text NOT NULL,
	`q1Response` text NOT NULL,
	`q2Response` text NOT NULL,
	`q3Response` text NOT NULL,
	`pattern` enum('perfectionism','ambiguity','emotional_weight','executive_function','shame_spiral','permission_deficit') NOT NULL,
	`patternLabel` varchar(100) NOT NULL,
	`protectionSentence` text NOT NULL,
	`firstMove` text NOT NULL,
	`whereItEnds` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `threshold_diagnoses_id` PRIMARY KEY(`id`)
);
