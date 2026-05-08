ALTER TABLE `users` ADD `isFoundingMember` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `foundingMemberCohort` int;--> statement-breakpoint
ALTER TABLE `users` ADD `foundingMemberJoinedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `trialEndsAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `foundingRateLocked` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `foundingTier` enum('pro','keeper');--> statement-breakpoint
ALTER TABLE `users` ADD `referredBy` int;--> statement-breakpoint
ALTER TABLE `users` ADD `referralBonusDays` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `referralCode` varchar(64);