CREATE TABLE `clarity_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`mode` enum('overwhelm','decision','creative_block','identity_drift','relationship_tension','purpose_fog') NOT NULL,
	`brainDump` text NOT NULL,
	`whatIsHappening` text,
	`whatYouFeel` text,
	`whatYouNeed` text,
	`nextRightStep` text,
	`signalLine` text,
	`progressMarker` enum('clearer','still_unsure','ready_to_act','need_to_revisit'),
	`convertedTo` enum('next_step','todays_focus','project_note','compass_item','journal_reflection'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clarity_sessions_id` PRIMARY KEY(`id`)
);
