import { RequestValidationError, type RequestDatabase } from "./community-requests.ts";

const cookieName = "bt-community";
const encoder = new TextEncoder();
export const writeWindowMs = 600_000;
const budgets = { request: 5, report: 10 };

export function requireCommunityOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin
    || request.headers.get("sec-fetch-site") === "cross-site"
    || request.headers.get("x-bt-community") !== "1") {
    throw new RequestValidationError(403, "Envía la acción desde Better Together.");
  }
}

async function keyFor(secret: unknown) {
  if (typeof secret !== "string" || secret.length < 32 || secret.length > 512) {
    throw new RequestValidationError(503, "Los envíos aún no están habilitados. Intenta más tarde.");
  }
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
function hex(bytes: ArrayBuffer) { return Array.from(new Uint8Array(bytes), (n) => n.toString(16).padStart(2, "0")).join(""); }
async function signature(key: CryptoKey, value: string) { return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(value))); }

// Only the authenticated dispatcher identity is passed here, never browser fields.
// Anonymous cookies are a basic throttle, not proof of identity or bot protection.
export async function communityActor(request: Request, user: { userId: string } | null, secret: unknown, now = Date.now()) {
  const key = await keyFor(secret);
  if (user) return { actorKey: await signature(key, `user:${user.userId}`), cookie: null };
  const raw = request.headers.get("cookie")?.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  let token: string | null = null;
  if (raw && raw.length < 160) {
    const [id, expires, signed] = raw.split(".");
    if (/^[0-9a-f-]{36}$/i.test(id ?? "") && /^\d{13}$/.test(expires ?? "")
      && Number(expires) > now && Number(expires) <= now + 86_400_000 && /^[0-9a-f]{64}$/.test(signed ?? "")) {
      const bytes = Uint8Array.from(signed.match(/../g)!, (value) => parseInt(value, 16));
      if (await crypto.subtle.verify("HMAC", key, bytes, encoder.encode(`${id}.${expires}`))) token = id;
    }
  }
  if (token) return { actorKey: await signature(key, `anonymous:${token}`), cookie: null };
  const id = crypto.randomUUID();
  const value = `${id}.${now + 86_400_000}`;
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return { actorKey: await signature(key, `anonymous:${id}`),
    cookie: `${cookieName}=${value}.${await signature(key, value)}; Path=/api; Max-Age=86400; HttpOnly; SameSite=Strict${secure}` };
}

export async function consumeWriteBudget(db: RequestDatabase, actorKey: string, kind: keyof typeof budgets, now = Date.now()) {
  const bucket = Math.floor(now / writeWindowMs);
  const expires = new Date((bucket + 1) * writeWindowMs).toISOString();
  // A shared durable ceiling also bounds load from reset anonymous cookies.
  // It does not replace platform/network abuse protection for a public launch.
  for (const [key, limit] of [[`${kind}:${actorKey}:${bucket}`, budgets[kind]], [`site:${bucket}`, 1000]] as const) {
    const row = await db.prepare(`INSERT INTO write_limits (key, count, expires_at) VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET count = count + 1 WHERE count < ? RETURNING count`)
      .bind(key, expires, limit).first();
    if (!row) throw new RequestValidationError(429, "Hay demasiados envíos. Espera unos minutos antes de volver a intentar.");
  }
}

export const communityHeaders = { "Cache-Control": "private, no-store", Vary: "Cookie, oai-authenticated-user-id" };
export function communityFailure(error: unknown, cookie: string | null = null) {
  const known = error instanceof RequestValidationError;
  return Response.json({ error: known ? error.message : "No pudimos confirmar la recepción. Intenta nuevamente." },
    { status: known ? error.status : 503, headers: { ...communityHeaders, ...(cookie ? { "Set-Cookie": cookie } : {}), ...(known && error.status === 429 ? { "Retry-After": "600" } : {}) } });
}
