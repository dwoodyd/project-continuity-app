ALTER TABLE `source_items` ADD `mappingConfidence` enum('likely','possible','needs_review') DEFAULT 'needs_review';--> statement-breakpoint
ALTER TABLE `source_items` ADD `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `source_items` ADD `isDuplicate` int DEFAULT 0 NOT NULL;