CREATE TABLE `moderation_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`alert_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`reason` text NOT NULL,
	`from_status` text NOT NULL,
	`to_status` text NOT NULL,
	`revision` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`alert_id`) REFERENCES `alerts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_decisions_alert_revision` ON `moderation_decisions` (`alert_id`,`revision`);--> statement-breakpoint
ALTER TABLE `alerts` ADD `moderation_revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `alerts` ADD `moderation_decision_id` text;