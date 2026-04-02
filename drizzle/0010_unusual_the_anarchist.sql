ALTER TABLE `daily_plans` ADD `emotionalState` enum('focused','anxious','foggy','energized','drained');--> statement-breakpoint
ALTER TABLE `daily_plans` ADD `mentalLoad` enum('light','moderate','heavy');--> statement-breakpoint
ALTER TABLE `daily_plans` ADD `clarityModeSuggestion` varchar(50);