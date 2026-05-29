import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);

function readProjectFile(path) {
  return readFileSync(new URL(path, root), "utf8");
}

test("homepage presents a luxury travel-platform first impression", () => {
  const source = readProjectFile("app/page.tsx");

  assert.match(source, /The island, arranged beautifully/);
  assert.match(source, /Private Roatan days/);
  assert.match(source, /Plan your Roatan day/);
  assert.match(source, /guestConfidenceSignals/);
  assert.match(source, /Verified local operators/);
});

test("homepage blends cinematic hero, premium search, and a simplified guest journey", () => {
  const source = readProjectFile("app/page.tsx");

  assert.match(source, /Curated trip planner/);
  assert.match(source, /Featured Roatan picks/);
  assert.match(source, /Choose your Roatan style/);
  assert.doesNotMatch(source, /luxuryJourneyCards/);
});
