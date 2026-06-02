ALTER TABLE `users` ADD `tier` enum('pro','keeper');--> statement-breakpoint
ALTER TABLE `users` ADD `planKey` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `rateType` enum('founding','retail');