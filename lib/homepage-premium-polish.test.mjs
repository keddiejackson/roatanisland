import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);

function readProjectFile(path) {
  return readFileSync(new URL(path, root), "utf8");
}

test("homepage has premium marketplace polish sections", () => {
  const source = readProjectFile("app/page.tsx");

  assert.match(source, /premiumTripStats/);
  assert.match(source, /homepageAssurancePoints/);
  assert.match(source, /Hero trip planner/);
  assert.match(source, /Marketplace confidence/);
  assert.match(source, /Curated Roatan marketplace/);
});

test("homepage improves motion-aware search and empty states", () => {
  const source = readProjectFile("app/page.tsx");

  assert.match(source, /motion\.form/);
  assert.match(source, /No curated matches yet/);
  assert.match(source, /Reset trip search/);
  assert.match(source, /Plan with concierge/);
});
