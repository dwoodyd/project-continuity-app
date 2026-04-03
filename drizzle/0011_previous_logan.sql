CREATE TABLE `beta_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`createdByUserId` int NOT NULL,
	`usedByUserId` int,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`label` varchar(255),
	CONSTRAINT `beta_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `beta_invites_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `revoked_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jti` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`revokedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `revoked_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `revoked_sessions_jti_unique` UNIQUE(`jti`)
);
--> statement-breakpoint
ALTER TABLE `pattern_insights` MODIFY COLUMN `affectedProjectIds` json;