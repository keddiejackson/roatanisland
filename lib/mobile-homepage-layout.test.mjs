import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const headerSource = readFileSync("app/HomeHeroHeader.tsx", "utf8");
const homeSource = readFileSync("app/page.tsx", "utf8");

test("homepage header has a dedicated mobile navigation layout", () => {
  assert.match(headerSource, /aria-label="Mobile main navigation"/);
  assert.match(headerSource, /sm:hidden/);
  assert.match(headerSource, /aria-label="Desktop main navigation"/);
  assert.match(headerSource, /hidden sm:flex/);
  assert.match(headerSource, /List your business/);
});

test("homepage trip search date field is visibly labeled on mobile", () => {
  assert.match(homeSource, /<label className="grid gap-1">/);
  assert.match(homeSource, /Trip date/);
  assert.match(homeSource, /aria-label="Trip date"/);
  assert.match(homeSource, /className="brand-input min-h-12 py-3"/);
  assert.doesNotMatch(homeSource, /pt-5/);
});
