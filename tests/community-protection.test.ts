import assert from "node:assert/strict";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { communityActor, consumeWriteBudget, requireCommunityOrigin, communityFailure, writeWindowMs } from "../lib/community-protection.ts";
import { receiveRequest, publicRequestsSql, type RequestDatabase } from "../lib/community-requests.ts";
import { receiveReport, reportHandler } from "../lib/community-reports.ts";
import { decideRequest, moderationHandlers, type ModerationDatabase } from "../lib/moderation.ts";
import { purgeExpiredData } from "../lib/data-retention.ts";

const now = Date.parse("2026-10-09T20:00:00Z");
const secret = "synthetic-local-test-secret-32-chars-only";
const input = { sessionId: "santiago-2026-10-14", clientRequestId: crypto.randomUUID(),
  createdAt: new Date(now).toISOString(), alias: "Prueba", title: "Necesito una galleta", details: "Para compartir",
  category: "supplies", zone: "Pacífico Alto", connectivity: "online" };
const statusIs = (code: number) => (error: unknown) => (error as { status: number }).status === code;
function request(body: unknown = {}, cookie = "") {
  return new Request("https://app.test/api/reports", { method: "POST", headers: { Origin: "https://app.test", "Content-Type": "application/json", "X-BT-Community": "1", Cookie: cookie }, body: JSON.stringify(body) });
}
function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  const dir = new URL("../drizzle/", import.meta.url);
  for (const name of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL(name, dir), "utf8"));
  type Bound = { sql: string; values: (string | number | null)[] };
  function prepare(sql: string, values: Bound["values"] = []) {
    return { sql, values, bind(...next: Bound["values"]) { return prepare(sql, next); },
      async first<T>() { return (sqlite.prepare(sql).get(...values) as T) ?? null; },
      async all<T>() { return { results: sqlite.prepare(sql).all(...values) as T[] }; } };
  }
  const db = { prepare, async batch(statements: Bound[]) {
    sqlite.exec("BEGIN");
    try { const result = statements.map(({ sql, values }) => ({ meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } })); sqlite.exec("COMMIT"); return result; }
    catch (error) { sqlite.exec("ROLLBACK"); throw error; }
  } } as unknown as RequestDatabase & ModerationDatabase;
  return { sqlite, db, close: () => sqlite.close() };
}
async function approved(db: RequestDatabase & ModerationDatabase) {
  await receiveRequest({ ...input, clientRequestId: crypto.randomUUID() }, db, now);
  const id = (await db.prepare("SELECT id FROM alerts ORDER BY rowid DESC LIMIT 1").bind().first<{ id: string }>())!.id;
  await decideRequest(db, "owner", { id, expectedRevision: 0, action: "approve", reason: "reviewed" }, now);
  return id;
}

test("community writes require same origin and a custom header; invalid secret fails closed", async () => {
  requireCommunityOrigin(request());
  const invalidHeaders: Record<string, string>[] = [{}, { Origin: "https://evil.test", "X-BT-Community": "1" }, { Origin: "https://app.test" }, { Origin: "https://app.test", "X-BT-Community": "1", "Sec-Fetch-Site": "cross-site" }];
  for (const headers of invalidHeaders) {
    assert.throws(() => requireCommunityOrigin(new Request("https://app.test/api/reports", { headers })), statusIs(403));
  }
  for (const value of [undefined, "", "short"]) await assert.rejects(communityActor(request(), null, value, now), statusIs(503));
  assert.equal(communityFailure(Object.assign(new Error("internal SQL details"), {})).status, 503);
  assert.equal(communityFailure(new (await import("../lib/community-requests.ts")).RequestValidationError(429, "Espera")).headers.get("Retry-After"), "600");
});

test("signed anonymous cookie is stable, short lived and rejects tampering; user hash stores no identity", async () => {
  const first = await communityActor(request(), null, secret, now);
  assert.match(first.cookie!, /HttpOnly; SameSite=Strict; Secure/);
  const cookie = first.cookie!.split(";")[0];
  const second = await communityActor(request({}, cookie), null, secret, now + 1000);
  assert.equal(first.actorKey, second.actorKey); assert.equal(second.cookie, null);
  const changed = await communityActor(request({}, cookie.replace(/.$/, (s) => s === "0" ? "1" : "0")), null, secret, now);
  assert.notEqual(changed.actorKey, first.actorKey);
  assert.notEqual((await communityActor(request({}, cookie), null, secret, now + 86_400_001)).actorKey, first.actorKey);
  const user = await communityActor(request({}, cookie), { userId: "owner-only-private-id" }, secret, now);
  assert.equal(user.cookie, null); assert.match(user.actorKey, /^[a-f0-9]{64}$/); assert.equal(user.actorKey.includes("owner"), false);
  assert.equal(user.actorKey, (await communityActor(request(), { userId: "owner-only-private-id" }, secret, now)).actorKey);
});

test("durable concurrent budget enforces five requests, resets next window and preserves idempotent receipt", async () => {
  const { sqlite, db, close } = database();
  try {
    const attempts = await Promise.allSettled(Array.from({ length: 12 }, () => consumeWriteBudget(db, "actor", "request", now)));
    assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 5);
    assert.equal(sqlite.prepare("SELECT count FROM write_limits WHERE key LIKE 'request:%'").get()!.count, 5);
    assert.equal(attempts.filter((r) => r.status === "rejected" && r.reason.status === 429).length, 7);
    // Known retries bypass exhausted budget but return only a receipt.
    await receiveRequest(input, db, now);
    const retry = await receiveRequest({ ...input, title: "Otro texto" }, db, now, () => consumeWriteBudget(db, "actor", "request", now));
    assert.deepEqual(retry, { receipt: { received: true }, status: 200 });
    await assert.rejects(receiveRequest({ ...input, clientRequestId: crypto.randomUUID() }, db, now, () => consumeWriteBudget(db, "actor", "request", now)), statusIs(429));
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM alerts").get()!.n, 1);
    await consumeWriteBudget(db, "actor", "request", now + writeWindowMs);
    const bucket = Math.floor(now / writeWindowMs);
    sqlite.prepare("INSERT INTO write_limits VALUES (?, 1000, ?)").run(`site:${bucket + 2}`, new Date(now + 3 * writeWindowMs).toISOString());
    await assert.rejects(consumeWriteBudget(db, "another-cookie", "report", now + 2 * writeWindowMs), statusIs(429));
  } finally { close(); }
});

test("reports accept only visible requests and coded reasons, deduplicate without auto-hiding", async () => {
  const { sqlite, db, close } = database();
  try {
    const id = await approved(db);
    const report = { alertId: id, clientReportId: crypto.randomUUID(), reason: "spam" };
    const results = await Promise.all([receiveReport(db, "a", report, now), receiveReport(db, "a", report, now)]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 201]);
    assert.equal((await receiveReport(db, "a", { ...report, clientReportId: crypto.randomUUID(), reason: "safety" }, now)).status, 200);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM community_reports").get()!.n, 1);
    assert.equal(sqlite.prepare(publicRequestsSql).all(input.sessionId, input.createdAt, input.createdAt).length, 1);
    for (const body of [{ ...report, details: "someone else's text" }, { ...report, actorKey: "owner" }, { ...report, reason: "" }]) await assert.rejects(receiveReport(db, "b", body, now), statusIs(400));
    for (const status of ["pending-review", "hidden", "rejected"]) {
      sqlite.prepare("UPDATE alerts SET status = ?").run(status);
      await assert.rejects(receiveReport(db, "b", { ...report, clientReportId: crypto.randomUUID() }, now), statusIs(404));
    }
    sqlite.prepare("UPDATE alerts SET status = 'active'").run();
    await assert.rejects(receiveReport(db, "b", { ...report, clientReportId: crypto.randomUUID() }, now + 7_200_000), statusIs(404));
    const index = sqlite.prepare("EXPLAIN QUERY PLAN SELECT id FROM community_reports WHERE alert_id = ? AND resolved_at IS NULL").all(id);
    assert.match(String(index[0].detail), /idx_reports_alert_resolved/);
  } finally { close(); }
});

test("report API fails closed before storage and never leaks internal errors", async () => {
  for (const [secretValue, origin, expected] of [["", "https://app.test", 503], [secret, "https://evil.test", 403]] as const) {
    const handler = reportHandler({ identity: async () => null, secret: () => secretValue, database: () => { throw new Error("private database secret"); } });
    const req = request(); req.headers.set("Origin", origin);
    const response = await handler(req); assert.equal(response.status, expected);
    assert.match(response.headers.get("Cache-Control")!, /private, no-store/);
    assert.equal(JSON.stringify(await response.json()).includes("private database"), false);
  }
});

test("ten report attempts are durable and rejected payloads never consume budget", async () => {
  const { sqlite, db, close } = database();
  try {
    const ids: string[] = [];
    for (let i = 0; i < 11; i++) ids.push(await approved(db));
    for (const id of ids.slice(0, 10)) await receiveReport(db, "same-user", { alertId: id, clientReportId: crypto.randomUUID(), reason: "spam" }, now);
    await assert.rejects(receiveReport(db, "same-user", { alertId: ids[10], clientReportId: crypto.randomUUID(), reason: "spam" }, now), statusIs(429));
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM community_reports").get()!.n, 10);
    await assert.rejects(receiveRequest({ ...input, details: "email@example.test" }, db, now, () => { throw new Error("must not charge"); }), statusIs(422));
    await receiveReport(db, "same-user", { alertId: ids[10], clientReportId: crypto.randomUUID(), reason: "spam" }, now + writeWindowMs);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM community_reports").get()!.n, 11);
  } finally { close(); }
});

test("reported queue is private and a keep decision resolves only reports actually loaded", async () => {
  const { sqlite, db, close } = database();
  try {
    const id = await approved(db);
    await receiveReport(db, "a", { alertId: id, clientReportId: crypto.randomUUID(), reason: "spam" }, now);
    const api = moderationHandlers({ identity: async () => ({ userId: "owner" }), allowlist: () => "owner", database: () => db, now: () => now });
    const url = new Request(`https://app.test/api/moderation?session=${input.sessionId}&status=active&reported=1`);
    const body = await (await api.GET(url)).json() as { entries: { revision: number; reportIds: string[]; reportCount: number; reportReasons: string[] }[] };
    assert.equal(body.entries[0].reportCount, 1); assert.deepEqual(body.entries[0].reportReasons, ["spam"]);
    assert.equal(JSON.stringify(body).includes("actorKey"), false);
    const reviewed = body.entries[0].reportIds;
    await receiveReport(db, "b", { alertId: id, clientReportId: crypto.randomUUID(), reason: "privacy" }, now);
    await decideRequest(db, "owner", { id, expectedRevision: 1, action: "keep", reason: "reviewed", reportIds: reviewed }, now);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM community_reports WHERE resolved_at IS NULL").get()!.n, 1);
    assert.equal(sqlite.prepare("SELECT status FROM alerts").get()!.status, "active");
    assert.equal((await (await api.GET(url)).json() as typeof body).entries[0].reportCount, 1);
    await decideRequest(db, "owner", { id, expectedRevision: 2, action: "hide", reason: "privacy" }, now);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM community_reports WHERE resolved_at IS NULL").get()!.n, 0);
  } finally { close(); }
});

test("keep cannot resolve another request's reports and an audit failure rolls back report resolution", async () => {
  const { sqlite, db, close } = database();
  try {
    const id = await approved(db); const other = await approved(db);
    await receiveReport(db, "a", { alertId: other, clientReportId: crypto.randomUUID(), reason: "spam" }, now);
    const reportId = sqlite.prepare("SELECT id FROM community_reports").get()!.id as string;
    await assert.rejects(decideRequest(db, "owner", { id, expectedRevision: 1, action: "keep", reason: "reviewed", reportIds: [reportId] }, now), statusIs(409));
    sqlite.exec("CREATE TRIGGER fail_audit BEFORE INSERT ON moderation_decisions BEGIN SELECT RAISE(ABORT, 'unavailable'); END");
    await assert.rejects(decideRequest(db, "owner", { id: other, expectedRevision: 1, action: "keep", reason: "reviewed", reportIds: [reportId] }, now), /unavailable/);
    assert.equal(sqlite.prepare("SELECT resolved_at FROM community_reports").get()!.resolved_at, null);
    assert.equal(sqlite.prepare("SELECT moderation_revision FROM alerts WHERE id = ?").get(other)!.moderation_revision, 1);
  } finally { close(); }
});

test("approved retention scrubs expired text at seven days, purges identifiers at thirty and preserves current records", async () => {
  const { sqlite, db, close } = database();
  try {
    const id = await approved(db);
    await receiveReport(db, "a", { alertId: id, clientReportId: crypto.randomUUID(), reason: "spam" }, now);
    const expiry = now + 7_200_000; const day = 86_400_000;
    await purgeExpiredData(db, expiry + 7 * day - 1);
    assert.equal(sqlite.prepare("SELECT details FROM alerts WHERE id = ?").get(id)!.details, input.details);
    await purgeExpiredData(db, expiry + 7 * day);
    const scrubbed = sqlite.prepare("SELECT alias, title, details FROM alerts WHERE id = ?").get(id)!;
    assert.deepEqual({ ...scrubbed }, { alias: "Retirada", title: "", details: "" });
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM moderation_decisions").get()!.n, 1);
    const later = expiry + 30 * day;
    await receiveRequest({ ...input, clientRequestId: crypto.randomUUID(), createdAt: new Date(later).toISOString() }, db, later);
    await purgeExpiredData(db, later);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM moderation_decisions").get()!.n, 0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM community_reports").get()!.n, 0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM alerts").get()!.n, 1);
    assert.equal(sqlite.prepare("SELECT title FROM alerts").get()!.title, input.title);
    await purgeExpiredData(db, later); // safe to repeat
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM alerts").get()!.n, 1);
  } finally { close(); }
});
