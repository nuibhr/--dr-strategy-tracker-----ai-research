CREATE TABLE `brokerConnections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('settrade') NOT NULL DEFAULT 'settrade',
	`brokerId` varchar(16) NOT NULL,
	`appCode` varchar(64) NOT NULL DEFAULT 'ALGO_EQ',
	`appIdHint` varchar(32) NOT NULL,
	`encryptedAppSecret` text NOT NULL,
	`status` enum('configured','verified','error') NOT NULL DEFAULT 'configured',
	`lastCheckedAt` timestamp,
	`lastError` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brokerConnections_id` PRIMARY KEY(`id`),
	CONSTRAINT `brokerConnections_userId_unique` UNIQUE(`userId`)
);
