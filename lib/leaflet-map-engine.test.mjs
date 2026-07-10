import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readProjectFile(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("map browser uses Leaflet instead of hand-rendered OSM tiles", () => {
  const packageJson = JSON.parse(readProjectFile("package.json"));
  const source = readProjectFile("app/map/MapBrowser.tsx");

  assert.match(source, /import\("leaflet"\)/);
  assert.match(source, /leaflet-container/);
  assert.match(source, /\[\s*clusters,\s*hoveredId,\s*mapReady,/);
  assert.equal(packageJson.dependencies.leaflet, "^1.9.4");
  assert.doesNotMatch(source, /backgroundImage: `url\(/);
});

test("empty results overlay lets Leaflet keep map gestures", () => {
  const source = readProjectFile("app/map/MapBrowser.tsx");

  assert.match(
    source,
    /className="absolute inset-0 z-\[500\] pointer-events-none flex items-center justify-center p-8 text-center"/,
  );
  assert.match(
    source,
    /className="pointer-events-auto max-w-md rounded-2xl bg-white\/95 p-6 shadow"/,
  );
});
