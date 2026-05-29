import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);

function readProjectFile(path) {
  return readFileSync(new URL(path, root), "utf8");
}

test("homepage has a clearer editorial marketplace path", () => {
  const source = readProjectFile("app/page.tsx");
  const settingsSource = readProjectFile("lib/homepage-settings.ts");

  assert.match(source, /homepageControls\.listingsTitle/);
  assert.doesNotMatch(source, /Choose your Roatan style/);
  assert.match(settingsSource, /Verified local operators/);
  assert.match(settingsSource, /heroImageUrl/);
  assert.match(settingsSource, /sectionOrder/);
  assert.match(settingsSource, /homepageFeaturedListingIds/);
  assert.match(source, /Clear filters/);
  assert.doesNotMatch(source, /Open my trips/);
  assert.doesNotMatch(source, /For admins/);
});

test("admin settings includes draft publish, media library, and homepage checks", () => {
  const adminSource = readProjectFile("app/admin/settings/page.tsx");

  assert.match(adminSource, /Save Draft/);
  assert.match(adminSource, /Publish Live/);
  assert.match(adminSource, /Preview Draft/);
  assert.match(adminSource, /Restore Homepage Defaults/);
  assert.match(adminSource, /Media Library/);
  assert.match(adminSource, /Homepage Quality Checklist/);
  assert.match(adminSource, /getHomepageQualityChecklist/);
});

test("listing cards keep scan-first marketplace details", () => {
  const source = readProjectFile("app/HomeListingCard.tsx");

  assert.match(source, /Quick view/);
  assert.doesNotMatch(source, /Smart match/);
  assert.doesNotMatch(source, /conversionTags/);
});
