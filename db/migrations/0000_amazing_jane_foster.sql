CREATE TABLE `brand_settings` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`data` json NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brand_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`job_id` bigint unsigned,
	`kind` varchar(16) NOT NULL DEFAULT 'inbox',
	`filename` varchar(512) NOT NULL,
	`size_bytes` bigint unsigned NOT NULL,
	`mime` varchar(255),
	`storage_path` varchar(1024) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`instructions` text,
	`status` varchar(32) NOT NULL DEFAULT 'new',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`job_id` bigint unsigned NOT NULL,
	`author` varchar(16) NOT NULL,
	`body` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `secrets` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`value` text NOT NULL,
	`hint` varchar(16) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `secrets_id` PRIMARY KEY(`id`),
	CONSTRAINT `secrets_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` varchar(36) NOT NULL,
	`filename` varchar(512) NOT NULL,
	`size_bytes` bigint unsigned NOT NULL,
	`received_bytes` bigint unsigned NOT NULL DEFAULT 0,
	`mime` varchar(255),
	`kind` varchar(16) NOT NULL DEFAULT 'inbox',
	`job_id` bigint unsigned,
	`status` varchar(16) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `files_job_idx` ON `files` (`job_id`);--> statement-breakpoint
CREATE INDEX `files_kind_idx` ON `files` (`kind`);--> statement-breakpoint
CREATE INDEX `messages_job_idx` ON `messages` (`job_id`);