import assert from "node:assert/strict";
import { test } from "node:test";
import { randomCommunityAlias } from "../lib/community-alias.ts";
import { containsPersonalData } from "../lib/alerts.ts";

test("suggested aliases are pronounceable short words without personal data", () => {
  for (let i = 0; i < 500; i++) {
    const alias = randomCommunityAlias("", () => i);
    assert.match(alias, /^[A-Za-z]+ [A-Za-z]+\d{2}$/);
    assert.ok(alias.length >= 2 && alias.length <= 24);
    assert.equal(containsPersonalData({ alias, title: "Solicitud de prueba", details: "" }), false);
  }
});

test("changing an alias produces another suggestion even on a repeated random draw", () => {
  const first = randomCommunityAlias("", () => 0);
  assert.notEqual(randomCommunityAlias(first, () => 0), first);
});
