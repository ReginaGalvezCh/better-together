import assert from "node:assert/strict";
import test from "node:test";
import { armyPulseTopics, selectPulseTopics, type PulseTopic } from "../lib/army-pulse.ts";
const session = "santiago-2026-10-14";
test("curated pulse has at most three source-backed topics and no fabricated community posts", () => {
  const topics = selectPulseTopics(armyPulseTopics, session, "official");
  assert.equal(topics.length, 3);
  assert.equal(selectPulseTopics(armyPulseTopics, session, "community").length, 0);
  for (const item of topics) {
    assert.equal(new URL(item.url).protocol, "https:");
    assert.ok(item.source && item.detail && Number.isFinite(Date.parse(item.reviewedAt)));
  }
});
test("filters by selected date and origin before limiting the feed", () => {
  const seed = armyPulseTopics[0];
  const items: PulseTopic[] = [
    { ...seed, id: "other-date", sessions: ["santiago-2026-10-17"] },
    { ...seed, id: "community", origin: "community" },
    ...Array.from({ length: 5 }, (_, index) => ({ ...seed, id: `official-${index}` })),
  ];
  assert.deepEqual(selectPulseTopics(items, session, "official").map((item) => item.id), ["official-0", "official-1", "official-2"]);
  assert.deepEqual(selectPulseTopics(items, session, "community").map((item) => item.id), ["community"]);
});
