import assert from "node:assert/strict";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { authorizeModerator, decideRequest, moderationHandlers, type ModerationDatabase } from "../lib/moderation.ts";
import { receiveRequest, publicRequestsSql, type RequestDatabase } from "../lib/community-requests.ts";

const now = Date.parse("2026-10-09T20:00:00Z");

test("protected page retains signed-in account verification without granting permission", () => {
  const source = readFileSync(new URL("../app/moderation/page.tsx", import.meta.url), "utf8");
  assert.match(source, /user && <details/);
  assert.match(source, /Ver mi cuenta para verificar el acceso/);
  assert.match(source, /\{user\.userId\}/);
  assert.match(source, /authorizeModerator\(user, moderatorIds\(\)\)/);
  assert.match(source, /dynamic = "force-dynamic"/);
});
const input = { sessionId: "santiago-2026-10-14", clientRequestId: "12345678-1234-4123-8123-123456789abc",
  createdAt: new Date(now).toISOString(), alias: "Prueba", title: "Necesito una galleta", details: "Sin datos personales",
  category: "supplies", zone: "Cancha Pacífico", connectivity: "online" };

function database() {
  const sqlite = new DatabaseSync(":memory:");
  for (const name of ["0000_broken_cobalt_man.sql", "0001_cheerful_prowler.sql", "0002_real_sumo.sql", "0003_parched_moon_knight.sql"]) {
    sqlite.exec(readFileSync(new URL(`../drizzle/${name}`, import.meta.url), "utf8"));
  }
  type Bound = { sql: string; values: (string | number | null)[] };
  function prepare(sql: string, values: Bound["values"] = []) {
    return { sql, values, bind(...next: Bound["values"]) { return prepare(sql, next); },
      async first<T>() { return (sqlite.prepare(sql).get(...values) as T) ?? null; },
      async all<T>() { return { results: sqlite.prepare(sql).all(...values) as T[] }; } };
  }
  const db = { prepare, async batch(statements: Bound[]) {
    sqlite.exec("BEGIN");
    try {
      const results = statements.map(({ sql, values }) => ({ meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } }));
      sqlite.exec("COMMIT"); return results;
    } catch (error) { sqlite.exec("ROLLBACK"); throw error; }
  } };
  return { sqlite, db: db as unknown as ModerationDatabase & RequestDatabase,
    publicRows: () => sqlite.prepare(publicRequestsSql).all(input.sessionId, new Date(now).toISOString(), new Date(now).toISOString()) };
}

function request(action: unknown, origin: string | null = "https://app.test", extra: Record<string, string> = {}) {
  return new Request("https://app.test/api/moderation", { method: "POST", headers: {
    "Content-Type": "application/json", "X-BT-Moderation": "1", ...(origin ? { Origin: origin } : {}), ...extra,
  }, body: JSON.stringify(action) });
}
const action = (id: string, kind = "approve", revision = 0) => ({ id, action: kind, expectedRevision: revision, reason: kind === "approve" ? "reviewed" : "privacy" });

test("moderator permission fails closed without identity, exact membership or valid configuration", () => {
  for (const [user, ids, status] of [[null, "owner", 401], [{ userId: "visitor" }, "owner", 403],
    [{ userId: "owner" }, "", 503], [{ userId: "owner" }, undefined, 503],
    [{ userId: "owner" }, "owner,", 503], [{ userId: "ow" }, "owner", 403]] as const) {
    assert.throws(() => authorizeModerator(user, ids), (e: unknown) => (e as { status: number }).status === status);
  }
  assert.equal(authorizeModerator({ userId: "owner" }, "owner, second"), "owner");
});

test("unauthorized API calls never read private data or touch storage, including spoofed actor fields", async () => {
  for (const [user, allowlist, expected] of [[null, "owner", 401], [{ userId: "visitor" }, "owner", 403], [{ userId: "owner" }, "", 503]] as const) {
    const api = moderationHandlers({ identity: async () => user, allowlist: () => allowlist, database: () => { throw new Error("must not touch storage"); } });
    for (const response of [await api.GET(new Request("https://app.test/api/moderation?session=santiago-2026-10-14&status=pending-review")),
      await api.POST(request({ actorId: "owner", status: "active" }))]) {
      assert.equal(response.status, expected);
      assert.match(response.headers.get("Cache-Control")!, /private, no-store/);
      assert.deepEqual(Object.keys(await response.json() as object), ["error"]);
    }
  }
});

test("write boundary rejects absent or foreign Origin, cross-site fetch and missing custom header", async () => {
  const api = moderationHandlers({ identity: async () => ({ userId: "owner" }), allowlist: () => "owner", database: () => { throw new Error("must not touch storage"); } });
  for (const req of [request({}, null), request({}, "https://evil.test"), request({}, "https://app.test", { "sec-fetch-site": "cross-site" }), request({}, "https://app.test", { "x-bt-moderation": "" })]) {
    assert.equal((await api.POST(req)).status, 403);
  }
});

test("approve and hide update visibility without renewing expiry, with attributable audit records", async () => {
  const { sqlite, db, publicRows } = database();
  try {
    await receiveRequest(input, db, now);
    const id = sqlite.prepare("SELECT id FROM alerts").get()!.id as string;
    assert.equal(publicRows().length, 0);
    await decideRequest(db, "owner", action(id), now);
    assert.equal(publicRows().length, 1);
    assert.equal(sqlite.prepare("SELECT expires_at FROM alerts").get()!.expires_at, new Date(now + 7_200_000).toISOString());
    await decideRequest(db, "second", action(id, "hide", 1), now + 1_000);
    assert.equal(publicRows().length, 0);
    const audits = sqlite.prepare("SELECT * FROM moderation_decisions ORDER BY revision").all();
    assert.equal(audits.length, 2);
    assert.equal(audits[0].actor_id, "owner"); assert.equal(audits[1].actor_id, "second");
    assert.equal(audits[0].from_status, "pending-review"); assert.equal(audits[0].to_status, "active");
    assert.equal(audits[1].from_status, "active"); assert.equal(audits[1].to_status, "hidden");
    assert.equal("details" in audits[0], false);
    await assert.rejects(decideRequest(db, "owner", action(id, "approve", 2), now), (e: unknown) => (e as { status: number }).status === 409);
  } finally { sqlite.close(); }
});

test("two decisions from the same revision have one winner and one audit, retries are conflicts", async () => {
  const { sqlite, db } = database();
  try {
    await receiveRequest(input, db, now);
    const id = sqlite.prepare("SELECT id FROM alerts").get()!.id as string;
    const results = await Promise.allSettled([decideRequest(db, "owner", action(id), now), decideRequest(db, "second", action(id, "reject"), now)]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal((results.find((r) => r.status === "rejected") as PromiseRejectedResult).reason.status, 409);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM moderation_decisions").get()!.n, 1);
    await assert.rejects(decideRequest(db, "owner", action(id), now), (e: unknown) => (e as { status: number }).status === 409);
  } finally { sqlite.close(); }
});

test("rejection, expiry and invalid state transitions never publish", async () => {
  const { sqlite, db, publicRows } = database();
  try {
    await receiveRequest(input, db, now);
    const id = sqlite.prepare("SELECT id FROM alerts").get()!.id as string;
    await assert.rejects(decideRequest(db, "owner", action(id, "hide"), now), (e: unknown) => (e as { status: number }).status === 409);
    await assert.rejects(decideRequest(db, "owner", action(id), now + 7_200_000), (e: unknown) => (e as { status: number }).status === 409);
    await decideRequest(db, "owner", action(id, "reject"), now);
    assert.equal(publicRows().length, 0);
    await assert.rejects(decideRequest(db, "owner", action(id, "approve", 1), now), (e: unknown) => (e as { status: number }).status === 409);
  } finally { sqlite.close(); }
});

test("failed audit insert rolls back publication and revision", async () => {
  const { sqlite, db, publicRows } = database();
  try {
    await receiveRequest(input, db, now);
    const id = sqlite.prepare("SELECT id FROM alerts").get()!.id as string;
    // Synthetic failure is local-only and verifies the transaction boundary.
    sqlite.exec("CREATE TRIGGER fail_audit BEFORE INSERT ON moderation_decisions BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END");
    await assert.rejects(decideRequest(db, "owner", action(id), now), /audit unavailable/);
    assert.equal(publicRows().length, 0);
    assert.equal(sqlite.prepare("SELECT moderation_revision FROM alerts").get()!.moderation_revision, 0);
    assert.equal(sqlite.prepare("SELECT status FROM alerts").get()!.status, "pending-review");
  } finally { sqlite.close(); }
});

test("private list is bounded, session-isolated and excludes expiry and internal IDs", async () => {
  const { sqlite, db } = database();
  try {
    await receiveRequest(input, db, now);
    await receiveRequest({ ...input, clientRequestId: crypto.randomUUID(), sessionId: "santiago-2026-10-16" }, db, now);
    const api = moderationHandlers({ identity: async () => ({ userId: "owner" }), allowlist: () => "owner", database: () => db, now: () => now });
    const response = await api.GET(new Request("https://app.test/api/moderation?session=santiago-2026-10-14&status=pending-review"));
    assert.equal(response.status, 200);
    const body = await response.json() as { entries: Record<string, unknown>[] };
    assert.equal(body.entries.length, 1);
    assert.equal("clientRequestId" in body.entries[0], false);
    assert.equal("moderationDecisionId" in body.entries[0], false);
    assert.equal(body.entries[0].revision, 0);
    assert.equal((await api.GET(new Request("https://app.test/api/moderation?session=unknown&status=pending-review"))).status, 400);
    for (let i = 0; i < 55; i++) await receiveRequest({ ...input, clientRequestId: crypto.randomUUID() }, db, now);
    assert.equal(((await (await api.GET(new Request("https://app.test/api/moderation?session=santiago-2026-10-14&status=pending-review"))).json()) as { entries: unknown[] }).entries.length, 50);
    sqlite.prepare("UPDATE alerts SET expires_at = ?").run(new Date(now).toISOString());
    assert.equal(((await (await api.GET(new Request("https://app.test/api/moderation?session=santiago-2026-10-14&status=pending-review"))).json()) as { entries: unknown[] }).entries.length, 0);
  } finally { sqlite.close(); }
});

test("strict decision validation rejects browser-supplied actor, status, invalid reason and revision", async () => {
  const api = moderationHandlers({ identity: async () => ({ userId: "owner" }), allowlist: () => "owner", database: () => database().db, now: () => now });
  const id = crypto.randomUUID();
  for (const body of [{ ...action(id), actorId: "somebody" }, { ...action(id), status: "active" }, { ...action(id), expectedRevision: -1 }, { ...action(id), reason: "" }, { ...action(id), action: "restore" }]) {
    assert.equal((await api.POST(request(body))).status, 400);
  }
});
