import assert from "node:assert/strict";
import test from "node:test";
import { actionsByMoment, arrivalUrl, isConcertMoment, quentroUrl, ticketHelpUrl, returnUrl, safeMessage, uberUrl } from "../lib/quick-actions.ts";
import { readFileSync } from "node:fs";
test("prioritizes exactly three actions for each user-selected moment", () => {
  assert.deepEqual(actionsByMoment.before, ["arrival", "ticket", "prepare"]);
  assert.deepEqual(actionsByMoment.during, ["ticket", "meeting", "help"]);
  assert.deepEqual(actionsByMoment.leaving, ["uber", "return", "safe"]);
  assert.equal(isConcertMoment("during"), true);
  assert.equal(isConcertMoment("unknown"), false);
  assert.equal(isConcertMoment(null), false);
});
test("ticket guidance is available above section tabs and shared with the dock", () => {
  const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const dock = readFileSync(new URL("../components/quick-access-dock.tsx", import.meta.url), "utf8");
  const ticket = readFileSync(new URL("../components/ticket-access.tsx", import.meta.url), "utf8");
  assert.ok(home.indexOf("<TicketAccess />") < home.indexOf("<Tabs value={activeSection}"));
  assert.match(dock, /panel === "ticket" && <TicketGuide \/>/);
  assert.match(ticket, /no abre la app automáticamente/);
  assert.match(ticket, /aria-haspopup="dialog"/);
  assert.equal(quentroUrl, "https://www.quentro.com/");
  assert.equal(new URL(ticketHelpUrl).hostname, "help.ticketmaster.cl");
  assert.equal(new URL(quentroUrl).search, "");
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
