import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mapBrowserSource = readFileSync("app/map/MapBrowser.tsx", "utf8");

test("map trip plan panel stays compact and explains the empty state", () => {
  assert.match(mapBrowserSource, /lg:items-start/);
  assert.match(mapBrowserSource, /Start your route/);
  assert.match(mapBrowserSource, /Pick a listing/);
  assert.match(mapBrowserSource, /Save it as a stop/);
  assert.match(mapBrowserSource, /Add pickup context/);
});

test("empty trip plan actions are not misleading", () => {
  assert.match(mapBrowserSource, /disabled=\{savedTripPins\.length === 0\}/);
  assert.match(mapBrowserSource, /Explore listings/);
});

test("map concierge pro gives guests guided planning modes", () => {
  assert.match(mapBrowserSource, /Map Concierge Pro/);
  assert.match(mapBrowserSource, /Concierge map modes/);
  assert.match(mapBrowserSource, /Suggested routes/);
  assert.match(mapBrowserSource, /Airport arrival/);
  assert.match(mapBrowserSource, /Cruise day/);
});

test("trip panel explains readiness and the best next step", () => {
  assert.match(mapBrowserSource, /Plan your day/);
  assert.match(mapBrowserSource, /Route readiness/);
  assert.match(mapBrowserSource, /Best next step/);
  assert.match(mapBrowserSource, /Choose pickup first/);
});
