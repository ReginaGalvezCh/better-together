import assert from "node:assert/strict";
import test from "node:test";
import { eventSessions, getCountdownParts, getDefaultSession, getSessionPhase } from "../lib/events.ts";

test("selects the next available session", () => {
  assert.equal(getDefaultSession(new Date("2026-10-15T12:00:00-03:00")).id, "santiago-2026-10-16");
  assert.equal(getDefaultSession(new Date("2026-10-14T21:00:00-03:00")).id, "santiago-2026-10-14");
  assert.equal(getDefaultSession(new Date("2026-10-18T12:00:00-03:00")).id, "santiago-2026-10-17");
});

test("keeps each session phase independent", () => {
  const now = new Date("2026-10-16T12:00:00-03:00");
  assert.equal(getSessionPhase(eventSessions[0], now), "Cierre por confirmar");
  assert.equal(getSessionPhase(eventSessions[1], now), "Día del evento");
  assert.equal(getSessionPhase(eventSessions[2], now), "Antes");
});

test("countdown never becomes negative", () => {
  const countdown = getCountdownParts(eventSessions[0], new Date("2026-10-15T12:00:00-03:00"));
  assert.deepEqual(countdown, { days: 0, hours: 0, minutes: 0, complete: true });
});
