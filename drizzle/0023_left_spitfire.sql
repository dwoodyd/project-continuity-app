ALTER TABLE `users` ADD `paypalSubscriptionId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `isPro` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `proSince` timestamp;