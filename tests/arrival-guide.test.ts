import assert from "node:assert/strict";
import test from "node:test";
import { eventAccessSource, parkApproaches, parkArrivalSource } from "../lib/arrival-guide.ts";

test("offers the three published park approaches without invented gate mappings", () => {
  assert.deepEqual(parkApproaches.map((approach) => approach.label), ["Pedro de Valdivia", "Guillermo Mann", "Avenida Grecia"]);
  assert.equal(new Set(parkApproaches.map((approach) => approach.id)).size, 3);
  assert.equal(parkApproaches.some((approach) => "sector" in approach || "gate" in approach || "latitude" in approach), false);
  assert.match(parkArrivalSource, /^https:\/\/parqueestadionacional\.cl\//);
  assert.match(eventAccessSource, /^https:\/\/help\.ticketmaster\.cl\//);
});
