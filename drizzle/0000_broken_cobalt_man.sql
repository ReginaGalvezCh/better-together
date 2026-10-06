CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`alias` text NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`zone` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`connectivity` text DEFAULT 'online' NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_alerts_status_created_at` ON `alerts` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_alerts_zone_created_at` ON `alerts` (`zone`,`created_at`);--> statement-breakpoint
CREATE TABLE `anonymous_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_type` text NOT NULL,
	`category` text,
	`zone` text,
	`connectivity` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_events_type_created_at` ON `anonymous_events` (`event_type`,`created_at`);