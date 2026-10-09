CREATE TABLE `agent_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`mode` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`inspected` integer DEFAULT 0 NOT NULL,
	`decisions` integer DEFAULT 0 NOT NULL,
	`has_more` integer DEFAULT 0 NOT NULL,
	`failure_code` text
);
--> statement-breakpoint
CREATE INDEX `idx_agent_runs_started_at` ON `agent_runs` (`started_at`);--> statement-breakpoint
CREATE TABLE `agent_state` (
	`key` text PRIMARY KEY NOT NULL,
	`cursor_created_at` text,
	`cursor_id` text,
	`snapshot_at` text,
	`lease_id` text,
	`lease_until` text
);
