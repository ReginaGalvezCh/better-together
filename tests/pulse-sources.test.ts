import assert from "node:assert/strict";
import test from "node:test";
import { tikTokSourceCandidates } from "../lib/pulse-sources.ts";

test("preserves all seven user-supplied source names without guessing profiles", () => {
  assert.deepEqual(tikTokSourceCandidates.map((source) => source.suppliedName), ["karen voncita", "mary prado", "camkal", "cachaestaarmy", "bts.chileprojects", "catalipedema", "ladanipo_"]);
  assert.equal(new Set(tikTokSourceCandidates.map((source) => source.id)).size, 7);
});
test("unverified community candidates cannot imply active monitoring or official status", () => {
  for (const source of tikTokSourceCandidates) {
    assert.equal(source.verification, "pending");
    assert.equal(source.profileUrl, null);
    assert.equal(source.monitoringEnabled, false);
    assert.equal(source.origin, "community");
  }
});
