import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);

function readProjectFile(path) {
  return readFileSync(new URL(path, root), "utf8");
}

test("homepage has premium marketplace polish sections", () => {
  const source = readProjectFile("app/page.tsx");

  assert.match(source, /discoveryCards/);
  assert.match(source, /requestFlow/);
  assert.match(source, /Island planning console/);
  assert.match(source, /Start with the map\. Let Roa refine the day\./);
  assert.match(source, /The marketplace is curated before it gets crowded\./);
});

test("homepage improves motion-aware search and empty states", () => {
  const source = readProjectFile("app/page.tsx");

  assert.match(source, /motion\.form/);
  assert.match(source, /Roa can still plan this\./);
  assert.match(source, /Reset trip search/);
  assert.match(source, /Ask Roa/);
});
