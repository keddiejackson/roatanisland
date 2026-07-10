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
    /className="pointer-events-none absolute inset-x-3 bottom-3 z-\[500\]/,
  );
  assert.match(
    source,
    /className="pointer-events-auto max-w-md rounded-2xl bg-white\/95 p-4 shadow sm:p-6"/,
  );
});

test("mobile full map keeps the map before the planning controls", () => {
  const source = readProjectFile("app/map/MapBrowser.tsx");

  assert.match(source, /fixed inset-0 z-50 flex min-w-0 flex-col/);
  assert.match(source, /fullMap \? "order-2 lg:order-5"/);
  assert.match(source, /fullMap \? "order-3 lg:order-2"/);
});
