CREATE TABLE `wren_letters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weekKey` varchar(20) NOT NULL,
	`letterText` text NOT NULL,
	`compassSeed` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `wren_letters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `wren_letters` ADD CONSTRAINT `wren_letters_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;