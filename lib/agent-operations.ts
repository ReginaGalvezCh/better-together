import { assessCandidate, applyModerationAssessments, agentBatchSize, type Candidate } from "./moderation-agent.ts";
import { purgeExpiredData, auditRetentionDays } from "./data-retention.ts";
import { type ModerationDatabase } from "./moderation.ts";
import { RequestValidationError } from "./community-requests.ts";

const leaseMs = 120_000;
type State = { cursorCreatedAt: string | null; cursorId: string | null; snapshotAt: string | null };
type PageCandidate = Candidate & { createdAt: string };

export async function agentStatus(db: ModerationDatabase, configuration: { execution?: unknown; retention?: unknown }) {
  const runs = await db.prepare(`SELECT id, mode, status, started_at AS startedAt, finished_at AS finishedAt,
    inspected, decisions, has_more AS hasMore, failure_code AS failureCode FROM agent_runs
    ORDER BY started_at DESC, id DESC LIMIT 10`).all();
  return { executionEnabled: configuration.execution === "true", retentionEnabled: configuration.retention === "true", runs: runs.results };
}

// One bounded page per call. Persisted keyset progression prevents the same
// first fifty human-review items from starving the rest of the queue.
export async function runAgentPage(db: ModerationDatabase, actor: string,
  configuration: { execution?: unknown; retention?: unknown }, now = Date.now(), clock = Date.now) {
  const at = new Date(now).toISOString();
  const runId = crypto.randomUUID();
  const mode = configuration.execution === "true" ? "apply" : "dry-run";
  const acquired = await db.batch([
    db.prepare("INSERT OR IGNORE INTO agent_state (key) VALUES ('moderation')"),
    db.prepare(`UPDATE agent_state SET lease_id = ?, lease_until = ? WHERE key = 'moderation'
      AND (lease_id IS NULL OR lease_until <= ?)`)
      .bind(runId, new Date(now + leaseMs).toISOString(), at),
    db.prepare(`INSERT INTO agent_runs (id, mode, status, started_at)
      SELECT ?, ?, 'running', ? FROM agent_state WHERE key = 'moderation' AND lease_id = ?`)
      .bind(runId, mode, at, runId),
  ]);
  if (acquired[1]?.meta.changes !== 1 || acquired[2]?.meta.changes !== 1) {
    throw new RequestValidationError(409, "Ya hay una revisión en curso. Reintenta más tarde.");
  }
  let inspected = 0;
  try {
    // A worker terminated before its catch leaves a durable running record.
    // The next holder marks it interrupted without copying private error data.
    await db.batch([db.prepare(`UPDATE agent_runs SET status = 'failed', failure_code = 'interrupted', finished_at = ?
      WHERE status = 'running' AND id != ?`).bind(at, runId)]);
    const states = await db.prepare(`SELECT cursor_created_at AS cursorCreatedAt, cursor_id AS cursorId,
      snapshot_at AS snapshotAt FROM agent_state WHERE key = 'moderation' AND lease_id = ?`).bind(runId).all<State>();
    const state = states.results[0];
    if (!state) throw new Error("lease-lost");
    const snapshot = state.snapshotAt ?? at;
    const rows = await db.prepare(`SELECT id, alias, title, details, moderation_revision AS revision, status, created_at AS createdAt,
      (SELECT COUNT(*) FROM community_reports r WHERE r.alert_id = alerts.id AND r.resolved_at IS NULL) AS reportCount
      FROM alerts WHERE status IN ('pending-review', 'active') AND expires_at > ? AND created_at <= ?
      AND (? IS NULL OR created_at > ? OR (created_at = ? AND id > ?))
      ORDER BY created_at ASC, id ASC LIMIT ?`)
      .bind(at, snapshot, state.cursorCreatedAt, state.cursorCreatedAt, state.cursorCreatedAt, state.cursorId, agentBatchSize + 1)
      .all<PageCandidate>();
    const page = rows.results.slice(0, agentBatchSize);
    inspected = page.length;
    const hasMore = rows.results.length > agentBatchSize;
    const preview = { evaluatedAt: at, truncated: hasMore, assessments: page.map(assessCandidate) };
    // Renew before applying. Revision checks still arbitrate with human review.
    const renew = async () => {
    const renewal = await db.batch([db.prepare(`UPDATE agent_state SET lease_until = ?
      WHERE key = 'moderation' AND lease_id = ? AND lease_until > ?`)
      .bind(new Date(clock() + leaseMs).toISOString(), runId, new Date(clock()).toISOString())]);
    if (renewal[0]?.meta.changes !== 1) throw new Error("lease-lost");
    };
    await renew();
    const result = mode === "apply" ? await applyModerationAssessments(db, `${actor}:${runId}`, preview, "false", now, renew) : null;
    // Cleanup is independently gated and only follows a successful complete sweep.
    await renew();
    const cleanup = !hasMore && mode === "apply" && configuration.retention === "true" ? await purgeExpiredData(db, now) : null;
    const last = hasMore ? page.at(-1)! : null;
    const finished = new Date(clock()).toISOString();
    const saved = await db.batch([
      db.prepare(`UPDATE agent_state SET cursor_created_at = ?, cursor_id = ?, snapshot_at = ?, lease_id = NULL, lease_until = NULL
        WHERE key = 'moderation' AND lease_id = ? AND lease_until > ?`).bind(last?.createdAt ?? null, last?.id ?? null, hasMore ? snapshot : null, runId, finished),
      db.prepare(`UPDATE agent_runs SET status = ?, finished_at = ?, inspected = ?, decisions = ?, has_more = ?
        WHERE id = ? AND changes() = 1`).bind(hasMore ? "partial" : "complete", finished, inspected, result?.decisions ?? 0, hasMore ? 1 : 0, runId),
      ...(mode === "apply" && configuration.retention === "true" ? [db.prepare("DELETE FROM agent_runs WHERE started_at <= ? AND status != 'running'")
        .bind(new Date(now - auditRetentionDays * 86_400_000).toISOString())] : []),
    ]);
    if (saved[0]?.meta.changes !== 1) throw new Error("lease-lost");
    return { runId, mode, inspected, decisions: result?.decisions ?? 0, hasMore, cleanupPerformed: cleanup !== null };
  } catch {
    // Never advance the cursor on failure. Previously committed decisions are
    // revision-audited; retrying cannot duplicate them. Errors store codes only.
    await db.batch([
      db.prepare(`UPDATE agent_runs SET status = 'failed', finished_at = ?, inspected = ?, failure_code = 'cycle-failed',
        decisions = (SELECT COUNT(*) FROM moderation_decisions WHERE actor_id = ?) WHERE id = ?`)
        .bind(new Date(clock()).toISOString(), inspected, `agent:conservative-triage-v1:${actor}:${runId}`, runId),
      db.prepare("UPDATE agent_state SET lease_id = NULL, lease_until = NULL WHERE key = 'moderation' AND lease_id = ?").bind(runId),
    ]);
    throw new RequestValidationError(503, "El recorrido no se completó. El fallo quedó registrado; puedes reintentar.");
  }
}
