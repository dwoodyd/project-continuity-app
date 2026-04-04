ALTER TABLE `users` ADD `welcomeNotified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `inviteCode` varchar(32);