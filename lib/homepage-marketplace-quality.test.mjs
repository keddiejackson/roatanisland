import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const homeHeaderSource = readFileSync("app/HomeHeroHeader.tsx", "utf8");
const adminNavSource = readFileSync("app/admin/AdminNav.tsx", "utf8");
const adminQualitySourcePath = "app/admin/listing-quality/page.tsx";

test("signed-in homepage header uses a compact profile menu", () => {
  assert.match(homeHeaderSource, /<details/);
  assert.match(homeHeaderSource, /Dashboard/);
  assert.match(homeHeaderSource, /Messages/);
  assert.match(homeHeaderSource, /Sign out/);
});

test("admin navigation exposes listing quality cleanup", () => {
  const adminQualitySource = readFileSync(adminQualitySourcePath, "utf8");

  assert.match(adminNavSource, /\/admin\/listing-quality/);
  assert.match(adminQualitySource, /Quality checklist/);
  assert.match(adminQualitySource, /getListingQualitySummary/);
});
