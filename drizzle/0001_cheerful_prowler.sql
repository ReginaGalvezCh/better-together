ALTER TABLE `alerts` ADD `session_id` text DEFAULT 'santiago-2026-10-14' NOT NULL;--> statement-breakpoint
ALTER TABLE `alerts` ADD `client_request_id` text;--> statement-breakpoint
CREATE INDEX `idx_alerts_session_status_created_at` ON `alerts` (`session_id`,`status`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_alerts_client_request_id` ON `alerts` (`client_request_id`);