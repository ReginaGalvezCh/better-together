import assert from "node:assert/strict";
import test from "node:test";
import { instagramPostSeeds, instagramReferenceUrl, instagramSourceCandidates } from "../lib/pulse-instagram-sources.ts";
import { collectPulseCandidates, canonicalPostUrl } from "../lib/pulse-intake.ts";

test("registers exactly the supplied Instagram handles without assigning authority or network access", () => {
  assert.deepEqual(instagramSourceCandidates.map((source) => source.handle), ["coreaconvale", "ktopchile", "soylatabita", "btsfamily_chile", "kspam.cl", "karen.voncita", "park_jiminie__cl", "sugachile", "koreanbasic"]);
  for (const source of instagramSourceCandidates) {
    assert.equal(source.verification, "user-provided");
    assert.equal(source.sourceType, "unclassified");
    assert.equal(source.monitoringEnabled, false);
    assert.equal(new URL(source.profileUrl).search, "");
  }
});
test("all sixteen post references remain unpublished and unassigned", () => {
  assert.equal(instagramPostSeeds.length, 16);
  assert.equal(new Set(instagramPostSeeds.map((seed) => seed.postUrl)).size, 16);
  for (const seed of instagramPostSeeds) {
    assert.equal(canonicalPostUrl("instagram", seed.postUrl), seed.postUrl);
    assert.equal(seed.reviewStatus, "pending");
    assert.equal(seed.sourceCandidateId, null);
  }
  const batch = collectPulseCandidates(instagramPostSeeds.map((seed) => ({ platform: "instagram", url: seed.postUrl })));
  assert.equal(batch.candidates.length, 16);
  assert.equal(batch.publishedCount, 0);
  assert.ok(batch.candidates.every((candidate) => candidate.status === "needs-context"));
});
test("preserves an explicitly supplied carousel slide without tracking parameters", () => {
  const seed = instagramPostSeeds.find((item) => item.referenceSlide === 3)!;
  const url = new URL(instagramReferenceUrl(seed));
  assert.equal(url.search, "?img_index=3");
  assert.equal(url.pathname, "/p/DeNegP0FH8g/");
});
