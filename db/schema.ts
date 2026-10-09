import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const alerts = sqliteTable(
  "alerts",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().default("santiago-2026-10-14"),
    clientRequestId: text("client_request_id"),
    alias: text("alias").notNull(),
    category: text("category").notNull(),
    title: text("title").notNull(),
    details: text("details").notNull().default(""),
    zone: text("zone").notNull(),
    status: text("status").notNull().default("active"),
    connectivity: text("connectivity").notNull().default("online"),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    reviewedAt: text("reviewed_at"),
    moderationRevision: integer("moderation_revision").notNull().default(0),
    moderationDecisionId: text("moderation_decision_id"),
  },
  (table) => [
    index("idx_alerts_status_created_at").on(table.status, table.createdAt),
    index("idx_alerts_session_status_created_at").on(table.sessionId, table.status, table.createdAt),
    index("idx_alerts_zone_created_at").on(table.zone, table.createdAt),
    uniqueIndex("idx_alerts_client_request_id").on(table.clientRequestId),
  ]
);

export const moderationDecisions = sqliteTable("moderation_decisions", {
  id: text("id").primaryKey(),
  alertId: text("alert_id").notNull().references(() => alerts.id),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),
  reason: text("reason").notNull(),
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  revision: integer("revision").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("idx_decisions_alert_revision").on(table.alertId, table.revision)]);

export const communityReports = sqliteTable("community_reports", {
  id: text("id").primaryKey(),
  clientReportId: text("client_report_id").notNull(),
  alertId: text("alert_id").notNull().references(() => alerts.id),
  actorKey: text("actor_key").notNull(),
  reason: text("reason").notNull(),
  createdAt: text("created_at").notNull(),
  resolvedAt: text("resolved_at"),
}, (table) => [
  uniqueIndex("idx_reports_client_id").on(table.clientReportId),
  uniqueIndex("idx_reports_alert_actor").on(table.alertId, table.actorKey),
  index("idx_reports_alert_resolved").on(table.alertId, table.resolvedAt),
]);

export const writeLimits = sqliteTable("write_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expiresAt: text("expires_at").notNull(),
}, (table) => [index("idx_write_limits_expiry").on(table.expiresAt)]);

export const anonymousEvents = sqliteTable(
  "anonymous_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventType: text("event_type").notNull(),
    category: text("category"),
    zone: text("zone"),
    connectivity: text("connectivity"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_events_type_created_at").on(table.eventType, table.createdAt),
  ]
);
