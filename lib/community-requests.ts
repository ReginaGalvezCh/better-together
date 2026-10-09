import { alertInputSchema, containsPersonalData } from "./alerts.ts";

export const publicRequestsSql = `SELECT id, session_id AS sessionId,
  alias, category, title, details, zone, connectivity, status,
  created_at AS createdAt, expires_at AS expiresAt, reviewed_at AS reviewedAt
  FROM alerts WHERE session_id = ? AND status = 'active'
  AND reviewed_at IS NOT NULL AND reviewed_at <= ? AND expires_at > ?
  ORDER BY created_at DESC LIMIT 50`;

export interface RequestDatabase {
  prepare(sql: string): {
    bind(...values: (string | number | null)[]): {
      first<T>(): Promise<T | null>;
    };
  };
}

export class RequestValidationError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export async function receiveRequest(body: unknown, db: RequestDatabase, now = Date.now()) {
  const parsed = alertInputSchema.safeParse(body);
  if (!parsed.success) throw new RequestValidationError(400, "Revisa los datos de la solicitud.");
  const input = parsed.data;
  if (containsPersonalData(input)) throw new RequestValidationError(422, "No incluyas datos personales ni coordenadas.");
  const createdAt = Date.parse(input.createdAt);
  if (now - createdAt >= 7_200_000) throw new RequestValidationError(410, "La solicitud guardada ya venció.");
  if (createdAt - now > 300_000) throw new RequestValidationError(400, "La fecha no es válida.");
  // Atomic conflict handling: retries cannot duplicate or renew a request.
  // A generic receipt never discloses another person's text for a guessed ID.
  const inserted = await db.prepare(`INSERT INTO alerts
    (id, session_id, client_request_id, alias, category, title, details, zone,
     connectivity, status, created_at, expires_at, reviewed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending-review', ?, ?, NULL)
    ON CONFLICT(client_request_id) DO NOTHING RETURNING id`)
    .bind(crypto.randomUUID(), input.sessionId, input.clientRequestId, input.alias,
      input.category, input.title, input.details, input.zone, input.connectivity,
      new Date(createdAt).toISOString(), new Date(createdAt + 7_200_000).toISOString())
    .first<{ id: string }>();
  if (inserted) {
    try {
      await db.prepare(`INSERT INTO anonymous_events
        (event_type, category, zone, connectivity, created_at)
        VALUES ('request_received_for_review', ?, ?, ?, ?) RETURNING id`)
        .bind(input.category, input.zone, input.connectivity, new Date(now).toISOString()).first();
    } catch { /* Optional aggregate telemetry must not invalidate durable receipt. */ }
  }
  return { receipt: { received: true as const }, status: inserted ? 201 : 200 };
}

export async function readBoundedJson(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new RequestValidationError(415, "Envía la solicitud en formato JSON.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new RequestValidationError(400, "Solicitud vacía.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        throw new RequestValidationError(413, "Solicitud demasiado grande.");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    try { return JSON.parse(new TextDecoder().decode(bytes)); }
    catch { throw new RequestValidationError(400, "JSON no válido."); }
  } finally { reader.releaseLock(); }
}
