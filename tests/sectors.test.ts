import assert from "node:assert/strict";
import test from "node:test";
import { filterByZone, isZone, sectors, zones } from "../lib/sectors.ts";

test("accepts only the sectors defined by the experience", () => {
  assert.equal(isZone("Cancha Andes"), true);
  assert.equal(isZone("Nivel 1"), false);
  assert.equal(zones.includes("Nivel 1"), true); // Earlier queued requests remain valid.
  assert.equal(isZone("coordenadas exactas"), false);
});

test("filters alerts without exposing coordinates", () => {
  const alerts = [
    { id: "one", zone: "Cancha Andes" as const },
    { id: "two", zone: "Nivel 1" as const },
  ];

  assert.deepEqual(filterByZone(alerts, "Cancha Andes"), [alerts[0]]);
  assert.deepEqual(filterByZone(alerts, null), alerts);
  assert.equal(sectors.some((sector) => "latitude" in sector || "longitude" in sector), false);
});
