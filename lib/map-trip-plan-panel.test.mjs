import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mapBrowserSource = readFileSync("app/map/MapBrowser.tsx", "utf8");

test("map trip plan panel stays compact and explains the empty state", () => {
  assert.match(mapBrowserSource, /lg:items-start/);
  assert.match(mapBrowserSource, /Save a stop to build your day/);
  assert.doesNotMatch(mapBrowserSource, /Start your route/);
  assert.doesNotMatch(mapBrowserSource, /Pick a listing/);
  assert.doesNotMatch(mapBrowserSource, /Save it as a stop/);
  assert.doesNotMatch(mapBrowserSource, /Add pickup context/);
});

test("empty trip plan actions are not misleading", () => {
  assert.match(mapBrowserSource, /disabled=\{savedTripPins\.length === 0\}/);
  assert.match(mapBrowserSource, /Explore listings/);
});

test("simple map flow names the experience and hides deeper controls", () => {
  assert.match(mapBrowserSource, /Island Planner/);
  assert.match(mapBrowserSource, /Roatan Day Map/);
  assert.match(mapBrowserSource, /Start point/);
  assert.match(mapBrowserSource, /Day style/);
  assert.match(mapBrowserSource, /More filters/);
  assert.match(mapBrowserSource, /showAdvancedFilters/);
  assert.doesNotMatch(mapBrowserSource, /Where are you starting/);
  assert.doesNotMatch(mapBrowserSource, /Suggested routes/);
  assert.doesNotMatch(mapBrowserSource, /Choose your day style/);
});

test("simple map flow keeps guided planning modes", () => {
  assert.match(mapBrowserSource, /Airport arrival/);
  assert.match(mapBrowserSource, /Cruise day/);
});

test("trip panel explains readiness and the best next step", () => {
  assert.match(mapBrowserSource, /Plan your day/);
  assert.match(mapBrowserSource, /Plan status/);
  assert.match(mapBrowserSource, /Best next step/);
  assert.match(mapBrowserSource, /Save plan/);
  assert.match(mapBrowserSource, /Choose pickup first/);
  assert.doesNotMatch(mapBrowserSource, /Route readiness/);
});
