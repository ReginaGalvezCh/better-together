import assert from "node:assert/strict";
import test from "node:test";
import { tikTokPostSeeds, tikTokSourceCandidates } from "../lib/pulse-sources.ts";

test("preserves eleven source names and keeps similarly named BTS accounts separate", () => {
  assert.deepEqual(tikTokSourceCandidates.map((source) => source.suppliedName), ["karen voncita", "mary prado", "camkal", "cachaestaarmy", "bts.chileprojects", "catalipedema", "ladanipo_", "cataschulbe", "catahrsc", "bts.chileofficial", "franchekal"]);
  assert.equal(new Set(tikTokSourceCandidates.map((source) => source.id)).size, 11);
});
test("unverified community candidates cannot imply active monitoring or official status", () => {
  for (const source of tikTokSourceCandidates) {
    assert.equal(source.monitoringEnabled, false);
    assert.equal(source.origin, "community");
    if (source.verification === "pending") assert.equal(source.profileUrl, null);
  }
});

test("only explicitly supplied profiles are associated, without tracking parameters", () => {
  const linked = tikTokSourceCandidates.filter((source) => source.verification === "user-provided");
  assert.deepEqual(linked.map((source) => source.id), ["catalipedema", "cataschulbe", "catahrsc", "bts-chileofficial", "franchekal"]);
  for (const source of linked) {
    const url = new URL(source.profileUrl!);
    assert.equal(url.origin, "https://www.tiktok.com");
    assert.equal(url.pathname, `/@${source.suppliedName}`);
    assert.equal(url.search, "");
  }
});

test("resolved post seeds remain unassigned and pending editorial review", () => {
  assert.equal(tikTokPostSeeds.length, 4);
  assert.equal(new Set(tikTokPostSeeds.map((seed) => seed.postUrl)).size, 4);
  for (const seed of tikTokPostSeeds) {
    const url = new URL(seed.postUrl);
    assert.equal(url.origin, "https://www.tiktok.com");
    assert.match(url.pathname, /^\/@[a-zA-Z0-9._]+\/video\/\d+$/);
    assert.equal(url.search, "");
    assert.equal(seed.sourceCandidateId, null);
    assert.equal(seed.reviewStatus, "pending");
  }
});
