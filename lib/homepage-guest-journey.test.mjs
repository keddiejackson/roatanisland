import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("app/page.tsx", "utf8");

test("homepage leads guests into a guided Roatan planning journey", () => {
  assert.match(source, /Plan your Roatan day in three calm steps/);
  assert.match(source, /Airport pickup/);
  assert.match(source, /Ready to plan your Roatan day/);
});

test("homepage listing cards use premium fallback imagery", () => {
  assert.doesNotMatch(source, /No image yet/);
  assert.match(source, /Image coming soon/);
});

test("homepage exposes clear trust signals before conversion", () => {
  assert.match(source, /guestConfidenceSignals/);
  assert.match(source, /Verified local operators/);
  assert.match(source, /Secure request flow/);
});
