import assert from "node:assert/strict";
import test from "node:test";
import { collectFromX } from "../lib/pulse-x.ts";

const now = new Date("2026-10-08T22:00:00Z");
const config = { enabled: true, bearerToken: "test-secret" };
const payload = { data: [{ id: "123", text: "#BTSChile Metro disponible", created_at: "2026-10-08T21:00:00Z" }], meta: { newest_id: "123" } };
test("X remains inactive without explicit opt-in; invalid configuration never calls network", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; return Response.json(payload); };
  await assert.rejects(collectFromX({ bearerToken: "" }, fetcher, now), /disabled/);
  await assert.rejects(collectFromX({ ...config, accounts: ["user OR anything"] }, fetcher, now), /Invalid X configuration/);
  assert.equal(calls, 0);
});
test("X uses one bounded authenticated request and routes results to review", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async (input, init) => {
    calls++;
    const url = new URL(String(input));
    assert.equal(url.origin + url.pathname, "https://api.x.com/2/tweets/search/recent");
    assert.equal(url.searchParams.get("max_results"), "10");
    assert.equal(url.searchParams.get("post.fields"), "created_at");
    assert.equal(url.searchParams.get("since_id"), "100");
    assert.equal(url.searchParams.has("start_time"), false);
    assert.match(url.searchParams.get("query")!, /from:explicit_user/);
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-secret");
    assert.equal(init?.redirect, "error");
    assert.ok(init?.signal);
    return Response.json(payload);
  };
  const result = await collectFromX({ ...config, accounts: ["explicit_user"], sinceId: "100" }, fetcher, now);
  assert.equal(calls, 1);
  assert.equal(result.candidates[0].url, "https://x.com/i/web/status/123");
  assert.equal(result.candidates[0].status, "pending-review");
  assert.equal(result.candidates[0].category, "transport");
  assert.equal(result.publishedCount, 0);
  assert.equal(result.nextSinceId, "123");
  assert.equal(JSON.stringify(result).includes("test-secret"), false);
});
test("paginated X results are marked incomplete without advancing cursor", async () => {
  const result = await collectFromX(config, async () => Response.json({ ...payload, meta: { newest_id: "123", next_token: "more" } }), now);
  assert.equal(result.hasMore, true);
  assert.equal(result.nextSinceId, null);
});
test("rate limits and partial failures stop without retry or provider error leakage", async () => {
  let calls = 0;
  await assert.rejects(collectFromX(config, async () => {
    calls++; return new Response("test-secret", { status: 429 });
  }, now), /rate limit/);
  assert.equal(calls, 1);
  await assert.rejects(collectFromX(config, async () => Response.json({ ...payload, errors: [{ detail: "test-secret" }] }), now), /Partial X response/);
  await assert.rejects(collectFromX(config, async () => Response.json({ data: [{ id: "invalid", text: "test-secret" }] }), now), /Invalid X response/);
  await assert.rejects(collectFromX(config, async () => { throw new Error("test-secret"); }, now), /X connection failed; no automatic retry/);
});

test("invalid collection time is rejected before any request, even with a cursor", async () => {
  let calls = 0;
  await assert.rejects(collectFromX({ ...config, sinceId: "100" }, async () => {
    calls++; return Response.json(payload);
  }, new Date("invalid")), /Invalid collection time/);
  assert.equal(calls, 0);
});
test("malformed empty batches fail; genuine zero-result batches preserve the cursor", async () => {
  for (const invalid of [{}, { meta: {} }, { data: [], meta: { result_count: 1 } }]) {
    await assert.rejects(collectFromX(config, async () => Response.json(invalid), now), /Invalid X response/);
  }
  const result = await collectFromX({ ...config, sinceId: "100" }, async () => Response.json({ meta: { result_count: 0 } }), now);
  assert.equal(result.fetchedCount, 0);
  assert.equal(result.nextSinceId, "100");
});
test("cursor comes from fetched IDs and cannot jump or regress with metadata", async () => {
  const fetcher: typeof fetch = async () => Response.json({ ...payload, meta: { newest_id: "999" } });
  assert.equal((await collectFromX(config, fetcher, now)).nextSinceId, "123");
  assert.equal((await collectFromX({ ...config, sinceId: "200" }, fetcher, now)).nextSinceId, "200");
});
