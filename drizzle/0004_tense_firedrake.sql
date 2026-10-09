CREATE TABLE `community_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`client_report_id` text NOT NULL,
	`alert_id` text NOT NULL,
	`actor_key` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL,
	`resolved_at` text,
	FOREIGN KEY (`alert_id`) REFERENCES `alerts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reports_client_id` ON `community_reports` (`client_report_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reports_alert_actor` ON `community_reports` (`alert_id`,`actor_key`);--> statement-breakpoint
CREATE INDEX `idx_reports_alert_resolved` ON `community_reports` (`alert_id`,`resolved_at`);--> statement-breakpoint
CREATE TABLE `write_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_write_limits_expiry` ON `write_limits` (`expires_at`);