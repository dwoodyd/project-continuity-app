CREATE TABLE `founding_seat_capacity` (
	`id` int NOT NULL,
	`claimed` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `founding_seat_capacity_id` PRIMARY KEY(`id`)
);
