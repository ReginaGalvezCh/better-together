import { moderationActionSchema, queueResponseSchema, reviewStates } from "./moderation-contract.ts";
import { eventSessionIds } from "./events.ts";
import { readBoundedJson, RequestValidationError } from "./community-requests.ts";

type Identity = { userId: string } | null;
interface Statement {
  bind(...values: (string | number | null)[]): Statement;
  all<T>(): Promise<{ results: T[] }>;
}
export interface ModerationDatabase {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<{ meta: { changes: number } }[]>;
}
export const privateHeaders = { "Cache-Control": "private, no-store", Vary: "Cookie, oai-authenticated-user-id" };

export function authorizeModerator(user: Identity, configuration: unknown) {
  if (!user) throw new RequestValidationError(401, "Inicia sesión para continuar.");
  if (typeof configuration !== "string" || !configuration.trim()) {
    throw new RequestValidationError(503, "La moderación aún no tiene responsables habilitados.");
  }
  const ids = configuration.split(",").map((id) => id.trim());
  if (ids.length > 20 || ids.some((id) => !id || id.length > 200 || /\s/.test(id))) {
    throw new RequestValidationError(503, "La configuración de moderación no está disponible.");
  }
  if (!ids.includes(user.userId)) throw new RequestValidationError(403, "Tu cuenta no tiene permiso para moderar.");
  return user.userId;
}

export function requireSameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin
    || request.headers.get("sec-fetch-site") === "cross-site"
    || request.headers.get("x-bt-moderation") !== "1") {
    throw new RequestValidationError(403, "La acción debe iniciarse desde el panel.");
  }
}

// No raw message text, email or coordinates are copied to the decision log.
export async function decideRequest(db: ModerationDatabase, actorId: string, value: unknown, now = Date.now()) {
  const parsed = moderationActionSchema.safeParse(value);
  if (!parsed.success) throw new RequestValidationError(400, "Revisa la decisión.");
  const { id, expectedRevision, action, reason } = parsed.data;
  const from = action === "hide" ? "active" : "pending-review";
  const to = action === "approve" ? "active" : action === "reject" ? "rejected" : "hidden";
  const at = new Date(now).toISOString();
  const decisionId = crypto.randomUUID();
  // D1 batch is transactional. The marker prevents a losing concurrent decision
  // from attributing somebody else's change to this actor in the audit insert.
  const results = await db.batch([
    db.prepare(`UPDATE alerts SET status = ?, reviewed_at = ?,
      moderation_revision = moderation_revision + 1, moderation_decision_id = ?
      WHERE id = ? AND status = ? AND moderation_revision = ? AND expires_at > ?`)
      .bind(to, at, decisionId, id, from, expectedRevision, at),
    db.prepare(`INSERT INTO moderation_decisions
      (id, alert_id, actor_id, action, reason, from_status, to_status, revision, created_at)
      SELECT ?, id, ?, ?, ?, ?, status, moderation_revision, ? FROM alerts
      WHERE id = ? AND moderation_decision_id = ? AND moderation_revision = ?`)
      .bind(decisionId, actorId, action, reason, from, at, id, decisionId, expectedRevision + 1),
  ]);
  if (results[0]?.meta.changes !== 1 || results[1]?.meta.changes !== 1) {
    throw new RequestValidationError(409, "La solicitud cambió o venció. Actualiza antes de decidir.");
  }
  return { changed: true, status: to, revision: expectedRevision + 1 };
}

type Dependencies = { identity: () => Promise<Identity>; allowlist: () => unknown; database: () => ModerationDatabase; now?: () => number };
export function moderationHandlers(deps: Dependencies) {
  async function boundary(action: () => Promise<unknown>) {
    try { return Response.json(await action(), { headers: privateHeaders }); }
    catch (error) {
      const known = error instanceof RequestValidationError;
      return Response.json({ error: known ? error.message : "No pudimos completar la revisión. Actualiza e intenta nuevamente." },
        { status: known ? error.status : 503, headers: privateHeaders });
    }
  }
  return {
    GET(request: Request) {
      return boundary(async () => {
        authorizeModerator(await deps.identity(), deps.allowlist());
        const url = new URL(request.url);
        const session = url.searchParams.get("session");
        const status = url.searchParams.get("status");
        if (!eventSessionIds.includes(session as typeof eventSessionIds[number]) || !reviewStates.includes(status as typeof reviewStates[number])) {
          throw new RequestValidationError(400, "Fecha o estado no válido.");
        }
        const at = new Date(deps.now?.() ?? Date.now()).toISOString();
        const rows = await deps.database().prepare(`SELECT id, session_id AS sessionId, alias,
          category, title, details, zone, status, created_at AS createdAt, expires_at AS expiresAt,
          reviewed_at AS reviewedAt, moderation_revision AS revision FROM alerts
          WHERE session_id = ? AND status = ? AND expires_at > ?
          ORDER BY created_at ASC LIMIT 50`).bind(session, status, at).all();
        return queueResponseSchema.parse({ entries: rows.results });
      });
    },
    POST(request: Request) {
      return boundary(async () => {
        const actor = authorizeModerator(await deps.identity(), deps.allowlist());
        requireSameOrigin(request);
        const body = await readBoundedJson(request);
        return decideRequest(deps.database(), actor, body, deps.now?.() ?? Date.now());
      });
    },
  };
}
