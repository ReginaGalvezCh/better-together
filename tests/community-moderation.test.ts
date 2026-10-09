import assert from "node:assert/strict";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { receiveRequest, publicRequestsSql, readBoundedJson, type RequestDatabase } from "../lib/community-requests.ts";
import { containsPersonalData, isPublicAlert, parsePending, parsePublicAlerts, removeHandledRequests, type AlertInput } from "../lib/alerts.ts";
import { readRequestQueue, saveRequestQueue, type QueueStorage } from "../lib/request-queue.ts";

const now = Date.parse("2026-10-09T18:00:00Z");
const input: AlertInput = {
  sessionId: "santiago-2026-10-14", clientRequestId: "12345678-1234-4123-8123-123456789abc",
  createdAt: new Date(now).toISOString(), alias: "Army", category: "supplies",
  title: "Necesito una galleta", details: "Para compartir", zone: "Pacífico Alto", connectivity: "online",
};

function database() {
  const sqlite = new DatabaseSync(":memory:");
  for (const name of ["0000_broken_cobalt_man.sql", "0001_cheerful_prowler.sql", "0002_real_sumo.sql"]) {
    sqlite.exec(readFileSync(new URL(`../drizzle/${name}`, import.meta.url), "utf8"));
  }
  const db: RequestDatabase = { prepare(sql) {
    return { bind(...values) { return { async first<T>() { return (sqlite.prepare(sql).get(...values) as T) ?? null; } }; } };
  } };
  return { sqlite, db };
}

test("atomic retries persist one pending row and never renew or reveal its content", async () => {
  const { sqlite, db } = database();
  try {
    const responses = await Promise.all([receiveRequest(input, db, now), receiveRequest(input, db, now)]);
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 201]);
    assert.deepEqual(responses.map((r) => r.receipt), [{ received: true }, { received: true }]);
    const collision = await receiveRequest({ ...input, alias: "Otra", title: "Otro mensaje", createdAt: new Date(now + 60_000).toISOString() }, db, now + 60_000);
    assert.deepEqual(collision, { status: 200, receipt: { received: true } });
    const rows = sqlite.prepare("SELECT * FROM alerts").all();
    assert.equal(rows.length, 1);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS total FROM anonymous_events").get()?.total, 1);
    assert.equal(rows[0].title, input.title);
    assert.equal(rows[0].status, "pending-review");
    assert.equal(rows[0].reviewed_at, null);
    assert.equal(rows[0].expires_at, new Date(now + 7_200_000).toISOString());
    assert.equal(sqlite.prepare(publicRequestsSql).all(input.sessionId, new Date(now).toISOString(), new Date(now).toISOString()).length, 0);
  } finally { sqlite.close(); }
});

test("public SQL and cached feed exclude non-reviewed, non-active and expired requests", async () => {
  const { sqlite, db } = database();
  try {
    await receiveRequest(input, db, now);
    const query = () => sqlite.prepare(publicRequestsSql).all(input.sessionId, new Date(now).toISOString(), new Date(now).toISOString());
    sqlite.prepare("UPDATE alerts SET status = 'active'").run();
    assert.equal(query().length, 0); // Historical active rows are not implicitly approved.
    sqlite.prepare("UPDATE alerts SET reviewed_at = ?").run(new Date(now).toISOString());
    assert.equal(query().length, 1);
    assert.equal("clientRequestId" in query()[0], false);
    const cached = parsePublicAlerts(query());
    assert.equal(cached.length, 1);
    assert.equal(isPublicAlert(cached[0], now), true);
    for (const status of ["pending-review", "hidden", "rejected", "resolved"]) {
      sqlite.prepare("UPDATE alerts SET status = ?").run(status);
      assert.equal(query().length, 0);
      assert.equal(parsePublicAlerts([{ ...cached[0], status }]).length, 0);
    }
    assert.equal(isPublicAlert({ ...cached[0], reviewedAt: null }, now), false);
    assert.equal(isPublicAlert(cached[0], now + 7_200_000), false);
    assert.equal(parsePublicAlerts([null, {}, { ...cached[0], reviewedAt: null }]).length, 0);
  } finally { sqlite.close(); }
});

test("validation fails before persistence for overrides, sensitive data and stale dates", async () => {
  const db: RequestDatabase = { prepare() { throw new Error("must not persist"); } };
  for (const [body, status] of [
    [{ ...input, status: "active" }, 400], [{ ...input, reviewedAt: input.createdAt }, 400],
    [{ ...input, details: "correo@example.test" }, 422],
    [{ ...input, details: "-33.45678, -70.56789" }, 422],
    [{ ...input, createdAt: new Date(now - 7_200_000).toISOString() }, 410],
    [{ ...input, createdAt: new Date(now + 300_001).toISOString() }, 400],
  ] as const) {
    await assert.rejects(receiveRequest(body, db, now), (error: unknown) => (error as { status: number }).status === status);
  }
  assert.equal(containsPersonalData({ ...input, details: "+56 9 1234 5678" }), true);
  assert.equal(containsPersonalData({ ...input, details: "12.345.678-9" }), true);
});

test("offline reconciliation preserves new drafts and retryable failures without public entries", () => {
  const second = { ...input, clientRequestId: "22345678-1234-4123-8123-123456789abc" };
  const current = [input, second];
  assert.deepEqual(removeHandledRequests(current, new Set([input.clientRequestId])), [second]);
  assert.deepEqual(removeHandledRequests(current, new Set()), current); // 429 / 503 remain queued.
  assert.deepEqual(parsePublicAlerts(current), []);
  assert.deepEqual(parsePending([null, {}, input]), [input]);
  assert.deepEqual(parsePending({ alerts: [input] }), []);
  assert.equal(parsePending(Array.from({ length: 101 }, () => input)).length, 101);
});

test("body boundary rejects oversized, invalid JSON and non-JSON payloads", async () => {
  const request = (body: string, type = "application/json") => new Request("https://example.test/api/alerts", { method: "POST", headers: { "Content-Type": type }, body });
  assert.deepEqual(await readBoundedJson(request(JSON.stringify(input))), input);
  for (const [req, status] of [[request("x".repeat(8193)), 413], [request("{"), 400], [request("{}", "text/plain"), 415]] as const) {
    await assert.rejects(readBoundedJson(req), (e: unknown) => (e as { status: number }).status === status);
  }
});

test("storage failures do not acknowledge receipt or publish", async () => {
  const db: RequestDatabase = { prepare() { throw new Error("storage unavailable"); } };
  await assert.rejects(receiveRequest(input, db, now), /storage unavailable/);
});

test("full or inaccessible local storage never truncates or overwrites drafts", () => {
  let stored = JSON.stringify(Array.from({ length: 100 }, () => input));
  let writes = 0;
  const storage: QueueStorage = { getItem: () => stored, setItem: (_key, value) => { stored = value; writes++; } };
  const before = stored;
  assert.throws(() => saveRequestQueue(storage, [...readRequestQueue(storage), input]), /queue_full/);
  assert.equal(writes, 0);
  assert.equal(stored, before);
  assert.equal(readRequestQueue(storage).length, 100);
  const inaccessible = { ...storage, getItem: () => { throw new Error("blocked"); } };
  assert.throws(() => saveRequestQueue(inaccessible, [...readRequestQueue(inaccessible), input]), /blocked/);
  assert.equal(writes, 0);
  assert.throws(() => saveRequestQueue({ ...storage, setItem: () => { throw new Error("quota"); } }, [input]), /quota/);
  assert.equal(stored, before);
});
