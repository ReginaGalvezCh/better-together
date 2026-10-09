import type { ModerationDatabase } from "./moderation.ts";

export const contentRetentionDays = 7;
export const auditRetentionDays = 30;
const day = 86_400_000;

// Internal maintenance only. No anonymous endpoint, scheduler or production
// cleanup is activated by importing this module or by merging the branch.
export async function purgeExpiredData(db: ModerationDatabase, now = Date.now()) {
  const contentBefore = new Date(now - contentRetentionDays * day).toISOString();
  const auditBefore = new Date(now - auditRetentionDays * day).toISOString();
  const at = new Date(now).toISOString();
  return db.batch([
    db.prepare("UPDATE alerts SET alias = 'Retirada', title = '', details = '' WHERE expires_at <= ? AND (alias != 'Retirada' OR title != '' OR details != '')").bind(contentBefore),
    // Delete dependents first; actor identifiers are never kept indefinitely.
    db.prepare("DELETE FROM community_reports WHERE created_at <= ?").bind(auditBefore),
    db.prepare("DELETE FROM moderation_decisions WHERE created_at <= ?").bind(auditBefore),
    db.prepare(`DELETE FROM alerts WHERE expires_at <= ?
      AND NOT EXISTS (SELECT 1 FROM moderation_decisions d WHERE d.alert_id = alerts.id)
      AND NOT EXISTS (SELECT 1 FROM community_reports r WHERE r.alert_id = alerts.id)`).bind(auditBefore),
    db.prepare("DELETE FROM write_limits WHERE expires_at <= ?").bind(at),
    db.prepare("DELETE FROM anonymous_events WHERE created_at <= ?").bind(auditBefore),
  ]);
}
