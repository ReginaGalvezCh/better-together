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
  },
  (table) => [
    index("idx_alerts_status_created_at").on(table.status, table.createdAt),
    index("idx_alerts_session_status_created_at").on(table.sessionId, table.status, table.createdAt),
    index("idx_alerts_zone_created_at").on(table.zone, table.createdAt),
    uniqueIndex("idx_alerts_client_request_id").on(table.clientRequestId),
  ]
);

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
