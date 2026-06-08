import assert from "node:assert/strict";
import test from "node:test";
import { getRoatanGuide, roatanGuides } from "./roatan-guides.ts";

test("publishes a focused set of Roatan authority guides", () => {
  assert.ok(roatanGuides.length >= 5);
  assert.equal(
    new Set(roatanGuides.map((guide) => guide.slug)).size,
    roatanGuides.length,
  );
});

test("guide pages have enough useful planning content", () => {
  for (const guide of roatanGuides) {
    assert.ok(guide.title.length > 12);
    assert.ok(guide.summary.length > 50);
    assert.ok(guide.sections.length >= 2);
    assert.ok(guide.bestFor.length >= 2);
  }
});

test("finds a guide by slug", () => {
  assert.equal(getRoatanGuide("roatan-cruise-day")?.eyebrow, "Cruise guest guide");
  assert.equal(getRoatanGuide("missing"), null);
});
