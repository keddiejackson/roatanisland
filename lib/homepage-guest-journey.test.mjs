import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("app/page.tsx", "utf8");

test("homepage leads guests into a guided Roatan planning journey", () => {
  assert.match(source, /Plan your Roatan day/);
  assert.match(source, /Explore experiences/);
  assert.match(source, /Trip planner/);
  assert.match(source, /Featured Roatan picks/);
  assert.match(source, /Choose your Roatan style/);
  assert.match(source, /Airport pickup/);
  assert.match(source, /Ready to plan your Roatan day/);
});

test("homepage listing cards use premium fallback imagery", () => {
  assert.doesNotMatch(source, /No image yet/);
  assert.match(source, /Image coming soon/);
});

test("homepage exposes clear trust signals before conversion", () => {
  assert.match(source, /guestConfidenceSignals/);
  assert.match(source, /Verified local operators/);
  assert.match(source, /Secure request flow/);
});

test("homepage removes repeated sections that made the page feel busy", () => {
  assert.doesNotMatch(source, /GuestMasterpieceSection/);
  assert.doesNotMatch(source, /BrandAbout/);
  assert.doesNotMatch(source, /TripPlannerDock/);
  assert.doesNotMatch(source, /audiencePaths/);
  assert.doesNotMatch(source, /luxuryJourneyCards/);
  assert.doesNotMatch(source, /categoryHighlights/);
});
