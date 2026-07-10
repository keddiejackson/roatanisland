import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const headerSource = readFileSync("app/HomeHeroHeader.tsx", "utf8");
const homeSource = readFileSync("app/page.tsx", "utf8");
const mobilePlatformSource = readFileSync("app/GuestMobilePlatform.tsx", "utf8");

test("homepage header has a dedicated mobile navigation layout", () => {
  assert.match(mobilePlatformSource, /aria-label="Open menu"/);
  assert.match(mobilePlatformSource, /aria-label="Mobile quick actions"/);
  assert.match(mobilePlatformSource, /role="dialog"/);
  assert.match(headerSource, /aria-label="Desktop main navigation"/);
  assert.match(headerSource, /hidden sm:flex/);
  assert.match(headerSource, /List your business/);
});

test("homepage trip search date field is visibly labeled on mobile", () => {
  assert.match(homeSource, /<label className="grid min-w-0 gap-1">/);
  assert.match(homeSource, /Trip date/);
  assert.match(homeSource, /aria-label="Trip date"/);
  assert.match(
    homeSource,
    /className="brand-input min-h-12 min-w-0 max-w-full appearance-none py-3"/,
  );
  assert.doesNotMatch(homeSource, /pt-5/);
});
