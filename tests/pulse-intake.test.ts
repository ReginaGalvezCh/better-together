import assert from "node:assert/strict";
import test from "node:test";
import { canonicalPostUrl, collectPulseCandidates } from "../lib/pulse-intake.ts";

const now = new Date("2026-10-08T22:00:00Z");
const post = { platform: "x", url: "https://x.com/example/status/123", text: "#BTSChile Información de acceso", publishedAt: "2026-10-08T21:00:00Z" };

test("intake normalizes social post links and never fetches arbitrary destinations", () => {
  assert.equal(canonicalPostUrl("x", "https://twitter.com/other/status/123?utm_source=test"), "https://x.com/i/web/status/123");
  assert.equal(canonicalPostUrl("instagram", "https://instagram.com/reel/ABC_12/?igsh=x"), "https://www.instagram.com/reel/ABC_12/");
  assert.equal(canonicalPostUrl("tiktok", "https://www.tiktok.com/@example/video/123?_t=x"), "https://www.tiktok.com/@example/video/123");
  for (const url of ["http://x.com/example/status/123", "https://x.com.evil.test/example/status/123", "https://u:p@x.com/example/status/123", "https://127.0.0.1/post", "https://x.com/example", "https://x.com:4433/example/status/123", "https://vt.tiktok.com/ABC/"]) {
    assert.equal(canonicalPostUrl("x", url), null);
  }
});
test("intake deduplicates by post identity, including previous batches", () => {
  const result = collectPulseCandidates([post, { ...post, url: "https://twitter.com/renamed/status/123?x=y" }], now);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.skipped.duplicate, 1);
  assert.equal(collectPulseCandidates([post], now, [post.url]).skipped.duplicate, 1);
});
test("intake rejects old, future, unrelated and invalid submissions", () => {
  const result = collectPulseCandidates([
    { ...post, publishedAt: "2026-10-06T21:00:00Z" },
    { ...post, publishedAt: "2026-10-09T21:00:00Z" },
    { ...post, text: "#BTSArirang Seoul" },
    { ...post, text: "#BTSChileFake" },
    { ...post, sessions: ["unrecognized"] },
    { ...post, origin: "official" },
  ], now);
  assert.deepEqual(result.skipped, { stale: 2, unrelated: 2, invalid: 2, duplicate: 0 });
  assert.equal(result.candidates.length, 0);
  assert.throws(() => collectPulseCandidates(Array(101).fill(post), now));
});
test("all candidates need review; link-only submissions need context", () => {
  const result = collectPulseCandidates([post, { platform: "instagram", url: "https://instagram.com/p/ABC/" }], now);
  assert.equal(result.publishedCount, 0);
  assert.equal(result.candidates[0].status, "pending-review");
  assert.equal(result.candidates[0].category, "access");
  assert.equal(result.candidates[0].origin, "community");
  assert.equal(result.candidates[1].status, "needs-context");
  assert.equal(result.candidates[1].excerpt, null);
});
test("sensitive candidates do not retain raw excerpts or personal data", () => {
  for (const text of ["#BTSChile menor perdido", "#BTSChile asistencia médica", "#BTSChile correo persona@example.com", "#BTSChile teléfono +56 9 1234 5678", "#BTSChile -33.46456,-70.61001"]) {
    const candidate = collectPulseCandidates([{ ...post, text }], now).candidates[0];
    assert.equal(candidate.status, "sensitive-review");
    assert.equal(candidate.excerpt, null);
    assert.equal("text" in candidate, false);
  }
});
