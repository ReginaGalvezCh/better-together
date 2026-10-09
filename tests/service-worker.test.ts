import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

function worker(fetcher: typeof fetch = async () => new Response("ok")) {
  const listeners = new Map<string, (event: unknown) => void>();
  const entries = new Map<string, Response>();
  const deleted: string[] = [];
  const written: string[] = [];
  const keyOf = (key: string | Request) => typeof key === "string" ? key : new URL(key.url).pathname;
  runInNewContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), {
    URL, Response, fetch: fetcher,
    self: { location: { origin: "https://example.test" }, addEventListener: (type: string, callback: (event: unknown) => void) => listeners.set(type, callback), clients: { claim() {} }, skipWaiting() {} },
    caches: {
      keys: async () => ["better-together-v1", "better-together-v2", "better-together-v3", "another-app"],
      delete: async (key: string) => { deleted.push(key); return true; },
      match: async (key: string | Request) => entries.get(keyOf(key)),
      open: async () => ({ put: async (key: string | Request, value: Response) => { written.push(keyOf(key)); entries.set(keyOf(key), value); } }),
    },
  });
  async function request(url: string, mode = "cors") {
    let result: Promise<Response> | undefined;
    const waits: Promise<unknown>[] = [];
    listeners.get("fetch")!({ request: { method: "GET", url, mode }, respondWith: (value: Promise<Response>) => { result = value; }, waitUntil: (value: Promise<unknown>) => waits.push(value) });
    const response = await result;
    await Promise.all(waits);
    return response;
  }
  return { listeners, request, entries, written, deleted };
}

test("offline navigation uses the shell but missing assets never receive HTML", async () => {
  const app = worker(async () => { throw new Error("offline"); });
  app.entries.set("/", new Response("<html>shell</html>"));
  assert.equal(await (await app.request("https://example.test/?day=14", "navigate"))!.text(), "<html>shell</html>");
  assert.equal((await app.request("https://example.test/assets/missing.js"))!.type, "error");
});
test("external weather and live API requests bypass the cache", async () => {
  const app = worker();
  assert.equal(await app.request("https://api.open-meteo.com/v1/forecast"), undefined);
  assert.equal(await app.request("https://example.test/api/alerts"), undefined);
  assert.deepEqual(app.written, []);
});
test("HTTP failures are not cached; healthy assets are cached", async () => {
  const failed = worker(async () => new Response("unavailable", { status: 503 }));
  assert.equal((await failed.request("https://example.test/assets/app.js"))!.status, 503);
  assert.deepEqual(failed.written, []);
  const healthy = worker();
  await healthy.request("https://example.test/assets/app.js");
  assert.deepEqual(healthy.written, ["/assets/app.js"]);
});
test("activation only removes obsolete Better Together caches", async () => {
  const app = worker();
  let completion: Promise<unknown> | undefined;
  app.listeners.get("activate")!({ waitUntil: (value: Promise<unknown>) => { completion = value; } });
  await completion;
  assert.deepEqual(app.deleted, ["better-together-v1", "better-together-v2"]);
});

test("moderation pages and auth flows never enter the public offline shell", async () => {
  const app = worker();
  for (const path of ["/moderation", "/moderation/private", "/signin-with-chatgpt", "/signout-with-chatgpt", "/callback", "/api/moderation"]) {
    assert.equal(await app.request(`https://example.test${path}`, "navigate"), undefined);
  }
  assert.deepEqual(app.written, []);
  const privateResponse = worker(async () => new Response("private", { headers: { "Cache-Control": "private, no-store" } }));
  await privateResponse.request("https://example.test/", "navigate");
  assert.deepEqual(privateResponse.written, []);
});
