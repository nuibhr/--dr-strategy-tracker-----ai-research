CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`positionId` int NOT NULL,
	`type` enum('tp_hit','sl_hit','price_alert') NOT NULL,
	`targetPrice` varchar(50) NOT NULL,
	`triggered` int NOT NULL DEFAULT 0,
	`triggeredAt` timestamp,
	`telegramNotified` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portfolios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `portfolios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`portfolioId` int NOT NULL,
	`ticker` varchar(50) NOT NULL,
	`drName` varchar(100) NOT NULL,
	`companyName` text,
	`entryPrice` varchar(50) NOT NULL,
	`entryPriceUSD` varchar(50),
	`stopLoss` varchar(50) NOT NULL,
	`takeProfit` varchar(50) NOT NULL,
	`currentPrice` varchar(50),
	`currentPriceUSD` varchar(50),
	`quantity` varchar(50) DEFAULT '1',
	`status` enum('open','closed','tp_hit','sl_hit') NOT NULL DEFAULT 'open',
	`pnl` varchar(50),
	`pnlPercent` varchar(50),
	`news` text,
	`outlook` text,
	`support` varchar(50),
	`resistance` varchar(50),
	`ratio` varchar(20) DEFAULT '1',
	`enteredAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `positions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sheetsSync` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sheetId` varchar(200) NOT NULL,
	`lastSyncAt` timestamp,
	`syncStatus` enum('pending','syncing','success','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sheetsSync_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `telegramSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`chatId` varchar(100) NOT NULL,
	`botToken` text NOT NULL,
	`enabled` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegramSettings_id` PRIMARY KEY(`id`)
);
