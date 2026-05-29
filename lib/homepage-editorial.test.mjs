import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);

function readProjectFile(path) {
  return readFileSync(new URL(path, root), "utf8");
}

test("homepage has a clearer editorial marketplace path", () => {
  const source = readProjectFile("app/page.tsx");

  assert.match(source, /Featured Roatan picks/);
  assert.match(source, /Choose your Roatan style/);
  assert.match(source, /Verified local operators/);
  assert.match(source, /Clear filters/);
  assert.doesNotMatch(source, /For admins/);
});

test("listing cards keep scan-first marketplace details", () => {
  const source = readProjectFile("app/page.tsx");

  assert.match(source, /Quick view/);
  assert.match(source, /trustBadges\.slice\(0, 2\)/);
  assert.match(source, /conversionTags\.slice\(0, 1\)/);
});
