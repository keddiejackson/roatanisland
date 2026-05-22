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
