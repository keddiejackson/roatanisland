import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);

function readProjectFile(path) {
  return readFileSync(new URL(path, root), "utf8");
}

test("homepage has a clearer editorial marketplace path", () => {
  const source = readProjectFile("app/page.tsx");
  const contentSource = readProjectFile("lib/homepage-content.ts");

  assert.match(source, /Featured Roatan picks/);
  assert.doesNotMatch(source, /Choose your Roatan style/);
  assert.match(contentSource, /Verified local operators/);
  assert.match(source, /Clear filters/);
  assert.doesNotMatch(source, /Open my trips/);
  assert.doesNotMatch(source, /For admins/);
});

test("listing cards keep scan-first marketplace details", () => {
  const source = readProjectFile("app/HomeListingCard.tsx");

  assert.match(source, /Quick view/);
  assert.doesNotMatch(source, /Smart match/);
  assert.doesNotMatch(source, /conversionTags/);
});
