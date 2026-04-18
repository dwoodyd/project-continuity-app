ALTER TABLE `notification_log` MODIFY COLUMN `type` enum('morning','midday','evening','cold_project','sanctuary','thread_thinning') NOT NULL;--> statement-breakpoint
ALTER TABLE `feedbackSubmissions` ADD `resolved` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `feedbackSubmissions` ADD `resolvedAt` timestamp;