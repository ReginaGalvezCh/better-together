import { z } from "zod";
import { readBoundedJson, RequestValidationError, type RequestDatabase } from "./community-requests.ts";
import { decisionReasons } from "./moderation-contract.ts";
import { communityActor, communityFailure, communityHeaders, consumeWriteBudget, requireCommunityOrigin } from "./community-protection.ts";

export const reportInputSchema = z.object({ alertId: z.string().uuid(), clientReportId: z.string().uuid(), reason: z.enum(decisionReasons) }).strict();

export async function receiveReport(db: RequestDatabase, actorKey: string, body: unknown, now = Date.now()) {
  const parsed = reportInputSchema.safeParse(body);
  if (!parsed.success) throw new RequestValidationError(400, "Elige un motivo para la denuncia.");
  const input = parsed.data;
  // Return only a generic receipt for duplicate IDs; never return stored content.
  const existing = await db.prepare("SELECT id FROM community_reports WHERE client_report_id = ? OR (alert_id = ? AND actor_key = ?)")
    .bind(input.clientReportId, input.alertId, actorKey).first();
  if (existing) return { receipt: { received: true }, status: 200 };
  const at = new Date(now).toISOString();
  const visible = await db.prepare("SELECT id FROM alerts WHERE id = ? AND status = 'active' AND reviewed_at IS NOT NULL AND reviewed_at <= ? AND expires_at > ?")
    .bind(input.alertId, at, at).first();
  if (!visible) throw new RequestValidationError(404, "La solicitud ya no está disponible para denunciar.");
  await consumeWriteBudget(db, actorKey, "report", now);
  const inserted = await db.prepare(`INSERT INTO community_reports
    (id, client_report_id, alert_id, actor_key, reason, created_at)
    SELECT ?, ?, id, ?, ?, ? FROM alerts WHERE id = ? AND status = 'active'
      AND reviewed_at IS NOT NULL AND reviewed_at <= ? AND expires_at > ?
    ON CONFLICT DO NOTHING RETURNING id`)
    .bind(crypto.randomUUID(), input.clientReportId, actorKey, input.reason, at, input.alertId, at, at).first();
  // A race with hiding/expiry must not be acknowledged as a stored new report.
  if (!inserted) {
    const duplicate = await db.prepare("SELECT id FROM community_reports WHERE client_report_id = ? OR (alert_id = ? AND actor_key = ?)")
      .bind(input.clientReportId, input.alertId, actorKey).first();
    if (!duplicate) throw new RequestValidationError(409, "La solicitud cambió. Actualiza antes de denunciar.");
  }
  return { receipt: { received: true }, status: inserted ? 201 : 200 };
}

type Dependencies = { identity: () => Promise<{ userId: string } | null>; secret: () => unknown; database: () => RequestDatabase; now?: () => number };
export function reportHandler(deps: Dependencies) {
  return async (request: Request) => {
    let cookie: string | null = null;
    try {
      requireCommunityOrigin(request);
      const now = deps.now?.() ?? Date.now();
      const actor = await communityActor(request, await deps.identity(), deps.secret(), now);
      cookie = actor.cookie;
      const result = await receiveReport(deps.database(), actor.actorKey, await readBoundedJson(request), now);
      return Response.json({ receipt: result.receipt }, { status: result.status, headers: { ...communityHeaders, ...(cookie ? { "Set-Cookie": cookie } : {}) } });
    } catch (error) { return communityFailure(error, cookie); }
  };
}
