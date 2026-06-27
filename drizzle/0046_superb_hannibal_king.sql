ALTER TABLE `user_profiles` ADD `readingBridgeChapter` varchar(64);--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `readingBridgeFinished` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `readingBridgeDismissed` boolean DEFAULT false;