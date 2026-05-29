import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);

function readProjectFile(path) {
  return readFileSync(new URL(path, root), "utf8");
}

test("homepage presents a luxury travel-platform first impression", () => {
  const source = readProjectFile("app/page.tsx");
  const contentSource = readProjectFile("lib/homepage-content.ts");

  assert.match(source, /The island, arranged beautifully/);
  assert.match(contentSource, /Private Roatan days/);
  assert.match(source, /Plan your Roatan day/);
  assert.match(source, /homepageTrustSignals/);
  assert.match(contentSource, /Verified local operators/);
});

test("homepage blends cinematic hero, premium search, and a simplified guest journey", () => {
  const source = readProjectFile("app/page.tsx");

  assert.match(source, /Curated trip planner/);
  assert.match(source, /Featured Roatan picks/);
  assert.doesNotMatch(source, /Choose your Roatan style/);
  assert.doesNotMatch(source, /Trip planner/);
  assert.doesNotMatch(source, /luxuryJourneyCards/);
});
