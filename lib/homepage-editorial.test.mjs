import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);

function readProjectFile(path) {
  return readFileSync(new URL(path, root), "utf8");
}

test("homepage has a clearer editorial marketplace path", () => {
  const source = readProjectFile("app/page.tsx");

  assert.match(source, /audiencePaths/);
  assert.match(source, /For travelers/);
  assert.match(source, /For vendors/);
  assert.match(source, /For admins/);
  assert.match(source, /Featured island picks/);
  assert.match(source, /Search, compare, then plan/);
  assert.match(source, /Clear filters/);
});

test("listing cards keep scan-first marketplace details", () => {
  const source = readProjectFile("app/page.tsx");

  assert.match(source, /Quick view/);
  assert.match(source, /trustBadges\.slice\(0, 2\)/);
  assert.match(source, /conversionTags\.slice\(0, 1\)/);
});
