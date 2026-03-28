CREATE TABLE `check_ins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`dailyPlanId` int,
	`date` varchar(10) NOT NULL,
	`type` enum('morning','midday','evening') NOT NULL,
	`userInput` text,
	`alignmentStatus` enum('aligned','recovering','redirect'),
	`generatedResponse` text,
	`extractedNextSteps` text,
	`linkedProjectIds` text,
	`interruptionsNoted` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `check_ins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`capacityLevel` enum('full','partial','low') DEFAULT 'full',
	`primaryProjectId` int,
	`secondaryProjectId` int,
	`criticalTasks` text,
	`timeBlocks` text,
	`likelyDistractions` text,
	`notesToReview` text,
	`generatedGuidance` text,
	`tomorrowBrief` text,
	`tomorrowBriefGeneratedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `idea_captures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`rawContent` text NOT NULL,
	`parsedIntent` text,
	`relatedProjectId` int,
	`capturedDuringTask` boolean DEFAULT false,
	`parkedStatus` boolean DEFAULT true,
	`scheduledReviewDate` varchar(10),
	`resolvedStatus` boolean DEFAULT false,
	`resolvedAt` timestamp,
	`sourceItemId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `idea_captures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(100),
	`whyItMatters` text,
	`status` enum('idea','mapped','active','paused','completed','archived') NOT NULL DEFAULT 'idea',
	`phase` enum('defining','building','refining','publishing','maintaining') DEFAULT 'defining',
	`priorityLevel` enum('low','medium','high') DEFAULT 'medium',
	`milestones` text,
	`goodEnoughThreshold` text,
	`nextStep` text,
	`blockers` text,
	`contextBreadcrumb` text,
	`lastTouchedAt` timestamp DEFAULT (now()),
	`completedAt` timestamp,
	`archiveSummary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `re_entry_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int NOT NULL,
	`stoppingPoint` text,
	`unresolvedDecision` text,
	`whatWasRuledOut` text,
	`nextPhysicalAction` text,
	`whyItMattersQuote` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`acknowledgedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `re_entry_cards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `source_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceType` enum('paste','text','markdown','pdf','docx','google_docs','notion','chatgpt_export','claude_export','notebooklm','transcript','voice','url','other') NOT NULL DEFAULT 'paste',
	`title` varchar(500),
	`rawContent` text,
	`cleanContent` text,
	`summary` text,
	`tags` text,
	`projectCandidates` text,
	`linkedProjectIds` text,
	`contentClass` enum('idea','draft','research','outline','decision','tasks','archive') DEFAULT 'idea',
	`state` enum('inbox','mapped','parked','active','today','done','archived') NOT NULL DEFAULT 'inbox',
	`fileUrl` text,
	`fileKey` varchar(500),
	`mimeType` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `source_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`timezone` varchar(64) DEFAULT 'America/New_York',
	`tonePreference` enum('gentle','direct','firm') DEFAULT 'direct',
	`focusHoursStart` varchar(8) DEFAULT '09:00',
	`focusHoursEnd` varchar(8) DEFAULT '17:00',
	`morningCheckInTime` varchar(8) DEFAULT '08:00',
	`middayCheckInTime` varchar(8) DEFAULT '12:00',
	`eveningCheckInTime` varchar(8) DEFAULT '17:00',
	`coldProjectThresholdDays` int DEFAULT 5,
	`weeklyReviewDay` enum('sunday','saturday','monday') DEFAULT 'sunday',
	`fontSizePreference` enum('small','medium','large') DEFAULT 'medium',
	`notificationsEnabled` boolean DEFAULT true,
	`onboardingCompleted` boolean DEFAULT false,
	`workTypes` text,
	`distractionPatterns` text,
	`primaryDistraction` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weekStartDate` varchar(10) NOT NULL,
	`projectsMoved` text,
	`projectsStalled` text,
	`patternsSurfaced` text,
	`primaryProjectIntention` int,
	`userNotes` text,
	`generatedSummary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_reviews_id` PRIMARY KEY(`id`)
);
