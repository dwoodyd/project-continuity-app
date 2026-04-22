CREATE TABLE `paypal_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_id` varchar(128) NOT NULL,
	`event_type` varchar(128) NOT NULL,
	`processed_at` bigint NOT NULL,
	CONSTRAINT `paypal_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `paypal_events_event_id_unique` UNIQUE(`event_id`)
);
--> statement-breakpoint
CREATE TABLE `waitlist_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(255),
	`reason` text,
	`created_at` bigint NOT NULL,
	CONSTRAINT `waitlist_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `scratch_notes` ADD `pinned` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `scratch_notes` ADD `colour` varchar(20);