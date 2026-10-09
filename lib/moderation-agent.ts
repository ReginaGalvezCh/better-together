import { containsPersonalData } from "./alerts.ts";
import { contentRetentionDays, auditRetentionDays } from "./data-retention.ts";
import { authorizeModerator, requireSameOrigin, privateHeaders, type ModerationDatabase } from "./moderation.ts";
import { readBoundedJson, RequestValidationError } from "./community-requests.ts";

export const agentPolicy = "conservative-triage-v1";
export const agentBatchSize = 50;
type Candidate = { id: string; alias: string; title: string; details: string; revision: number; status: string; reportCount: number };

// Rules are hints, not semantic moderation or fact checking. User content is
// data only: never executed, followed as instructions, or sent to a provider.
export function assessCandidate(candidate: Candidate) {
  const reasons: string[] = [];
  if (containsPersonalData(candidate)) reasons.push("personal-data");
  const text = `${candidate.title} ${candidate.details}`.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  if (/\b(?:matar|golpear|amenaza|odio|robo|emergencia|ambulancia|perdid[oa])\b/.test(text)) reasons.push("safety-review");
  if (/https?:\/\/|\b(?:transferencia|deposito|venta|comprar|sorteo)\b/.test(text)) reasons.push("promotion-review");
  if (candidate.reportCount > 0) reasons.push("community-report");
  return {
    id: candidate.id, revision: candidate.revision,
    reasons,
    recommendation: reasons.includes("personal-data") ? (candidate.status === "active" ? "hide-review" : "reject-review") : "human-review",
  };
}

// Deliberately SELECT-only. No decision, audit insert, cleanup, external request
// or activation flag can be triggered by this preview, including on retries.
export async function previewModerationCycle(db: ModerationDatabase, now = Date.now()) {
  const at = new Date(now).toISOString();
  const contentBefore = new Date(now - contentRetentionDays * 86_400_000).toISOString();
  const auditBefore = new Date(now - auditRetentionDays * 86_400_000).toISOString();
  const candidates = await db.prepare(`SELECT id, alias, title, details, moderation_revision AS revision, status,
    (SELECT COUNT(*) FROM community_reports r WHERE r.alert_id = alerts.id AND r.resolved_at IS NULL) AS reportCount
    FROM alerts WHERE status IN ('pending-review', 'active') AND expires_at > ?
    ORDER BY reportCount DESC, CASE status WHEN 'pending-review' THEN 0 ELSE 1 END, created_at ASC, id ASC
    LIMIT ?`).bind(at, agentBatchSize + 1).all<Candidate>();
  const counts = await db.prepare(`SELECT
    (SELECT COUNT(*) FROM alerts WHERE expires_at <= ? AND (alias != 'Retirada' OR title != '' OR details != '')) AS content,
    (SELECT COUNT(*) FROM community_reports WHERE created_at <= ?) AS reports,
    (SELECT COUNT(*) FROM moderation_decisions WHERE created_at <= ?) AS decisions,
    (SELECT COUNT(*) FROM alerts WHERE expires_at <= ?
      AND NOT EXISTS (SELECT 1 FROM moderation_decisions d WHERE d.alert_id = alerts.id AND d.created_at > ?)
      AND NOT EXISTS (SELECT 1 FROM community_reports r WHERE r.alert_id = alerts.id AND r.created_at > ?)) AS alerts,
    (SELECT COUNT(*) FROM write_limits WHERE expires_at <= ?) AS writeLimits,
    (SELECT COUNT(*) FROM anonymous_events WHERE created_at <= ?) AS anonymousEvents`)
    .bind(contentBefore, auditBefore, auditBefore, auditBefore, auditBefore, auditBefore, at, auditBefore)
    .all<Record<string, number>>();
  return { mode: "dry-run", policy: agentPolicy, evaluatedAt: at, writes: 0,
    scheduled: false, truncated: candidates.results.length > agentBatchSize,
    assessments: candidates.results.slice(0, agentBatchSize).map(assessCandidate),
    cleanupPreview: counts.results[0] };
}

export function agentPreviewHandler(deps: {
  identity: () => Promise<{ userId: string } | null>; allowlist: () => unknown;
  database: () => ModerationDatabase; now?: () => number;
}) {
  return async (request: Request) => {
    try {
      authorizeModerator(await deps.identity(), deps.allowlist());
      requireSameOrigin(request);
      const value = await readBoundedJson(request);
      if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length) {
        throw new RequestValidationError(400, "La simulación no acepta acciones ni opciones de activación.");
      }
      return Response.json(await previewModerationCycle(deps.database(), deps.now?.()), { headers: privateHeaders });
    } catch (error) {
      const known = error instanceof RequestValidationError;
      return Response.json({ error: known ? error.message : "No pudimos completar la simulación." },
        { status: known ? error.status : 503, headers: privateHeaders });
    }
  };
}
