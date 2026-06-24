CREATE TABLE `drPickEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pickId` int NOT NULL,
	`eventType` varchar(50) NOT NULL,
	`oldValue` text,
	`newValue` text,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `drPickEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drPicks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`market` varchar(50) NOT NULL,
	`entryDate` timestamp NOT NULL,
	`entryPrice` varchar(50) NOT NULL,
	`tp1` varchar(50) NOT NULL,
	`tp2` varchar(50) NOT NULL,
	`sl` varchar(50) NOT NULL,
	`status` enum('Hit TP1','Hit TP2','Hit SL','Near TP','Near SL','Waiting','Closed','Watchlist') NOT NULL DEFAULT 'Waiting',
	`reason` text,
	`note` text,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`closedAt` timestamp,
	CONSTRAINT `drPicks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drPriceSnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(50) NOT NULL,
	`price` varchar(50) NOT NULL,
	`changePercent` varchar(50),
	`volume` int,
	`source` varchar(50) NOT NULL DEFAULT 'mock',
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `drPriceSnapshots_id` PRIMARY KEY(`id`)
);
