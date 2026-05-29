import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);

function readProjectFile(path) {
  return readFileSync(new URL(path, root), "utf8");
}

test("homepage presents a luxury travel-platform first impression", () => {
  const source = readProjectFile("app/page.tsx");

  assert.match(source, /luxuryProofPoints/);
  assert.match(source, /The island, arranged beautifully/);
  assert.match(source, /Private Roatan days/);
  assert.match(source, /Trusted local operators/);
  assert.match(source, /Concierge-ready planning/);
});

test("homepage blends cinematic hero, premium search, and concierge journey", () => {
  const source = readProjectFile("app/page.tsx");

  assert.match(source, /luxuryJourneyCards/);
  assert.match(source, /Plan like a private client/);
  assert.match(source, /Reserve the day with confidence/);
  assert.match(source, /Curated marketplace search/);
  assert.match(source, /Signature Roatan experiences/);
});
