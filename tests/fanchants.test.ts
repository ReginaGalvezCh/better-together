import assert from "node:assert/strict";
import test from "node:test";
import { demoChant, nextCueIndex } from "../lib/fanchants.ts";

test("manual chant navigation stays within the guide without looping", () => {
  assert.equal(nextCueIndex(0, -1, 4), 0);
  assert.equal(nextCueIndex(0, 1, 4), 1);
  assert.equal(nextCueIndex(3, 1, 4), 3);
  assert.equal(nextCueIndex(2, -1, 4), 1);
  assert.equal(nextCueIndex(0, 1, 0), 0);
});
test("sample is visibly a demo, with unique cues and no invented timestamps", () => {
  assert.equal(demoChant.status, "demo");
  assert.match(demoChant.source, /No corresponde a una canción/);
  assert.equal(new Set(demoChant.cues.map((cue) => cue.id)).size, demoChant.cues.length);
  for (const cue of demoChant.cues) {
    assert.match(cue.when, /^Ejemplo:/);
    assert.ok(cue.shout && cue.note);
    assert.doesNotMatch(cue.when, /\d+:\d+/);
  }
});
