import assert from "node:assert/strict";
import test from "node:test";
import { actionsByMoment, arrivalUrl, isConcertMoment, returnUrl, safeMessage, uberUrl } from "../lib/quick-actions.ts";
test("prioritizes exactly three actions for each user-selected moment", () => {
  assert.deepEqual(actionsByMoment.before, ["arrival", "ticket", "prepare"]);
  assert.deepEqual(actionsByMoment.during, ["ticket", "meeting", "help"]);
  assert.deepEqual(actionsByMoment.leaving, ["uber", "return", "safe"]);
  assert.equal(isConcertMoment("during"), true);
  assert.equal(isConcertMoment("unknown"), false);
  assert.equal(isConcertMoment(null), false);
});
test("external links disclose only a public venue, not a fan location or home", () => {
  const arrival = new URL(arrivalUrl);
  assert.equal(arrival.searchParams.get("api"), "1");
  assert.equal(arrival.searchParams.has("origin"), false);
  assert.ok(arrival.searchParams.get("destination")?.includes("Estadio Nacional"));
  const leaving = new URL(returnUrl);
  assert.equal(leaving.searchParams.has("destination"), false);
  assert.ok(leaving.searchParams.get("origin")?.includes("Estadio Nacional"));
  assert.equal(new URL(uberUrl).search, "");
  assert.equal(safeMessage.includes("sector"), false);
});
