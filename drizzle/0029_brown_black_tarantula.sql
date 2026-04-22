CREATE TABLE `google_calendar_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`expires_at` bigint NOT NULL,
	`scope` varchar(512) NOT NULL DEFAULT '',
	`calendar_id` varchar(255) NOT NULL DEFAULT 'primary',
	`connected_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `google_calendar_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `google_calendar_tokens_userId_unique` UNIQUE(`userId`)
);
