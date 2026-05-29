import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);

function readProjectFile(path) {
  return readFileSync(new URL(path, root), "utf8");
}

test("homepage presents a luxury travel-platform first impression", () => {
  const source = readProjectFile("app/page.tsx");
  const settingsSource = readProjectFile("lib/homepage-settings.ts");

  assert.match(source, /homepageControls\.homepageHeadline/);
  assert.match(source, /homepageControls\.heroEyebrow/);
  assert.match(source, /homepageControls\.primaryCtaLabel/);
  assert.match(source, /homepageControls\.trustPoints/);
  assert.match(settingsSource, /The island, arranged beautifully/);
  assert.match(settingsSource, /Private Roatan days/);
  assert.match(settingsSource, /Verified local operators/);
});

test("homepage blends cinematic hero, premium search, and a simplified guest journey", () => {
  const source = readProjectFile("app/page.tsx");

  assert.match(source, /homepageControls\.listingsEyebrow/);
  assert.match(source, /homepageControls\.listingsTitle/);
  assert.doesNotMatch(source, /Choose your Roatan style/);
  assert.doesNotMatch(source, /Trip planner/);
  assert.doesNotMatch(source, /luxuryJourneyCards/);
});
