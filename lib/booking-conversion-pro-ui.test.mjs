import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

test("public account chip keeps sign out at the top", () => {
  const source = read("app/GlobalAccountButton.tsx");

  assert.match(source, /Sign out/);
  assert.match(source, /supabase\.auth\.signOut/);
  assert.match(source, /top-\[calc/);
  assert.match(source, /pathname === "\/"/);
});

test("homepage owns its header sign out without the floating chip", () => {
  const source = read("app/page.tsx");

  assert.match(source, /signOutHomeAccount/);
  assert.match(source, /Sign out/);
});

test("admin and vendor pages expose top sign out actions", () => {
  assert.match(read("app/admin/AdminNav.tsx"), /Sign out/);
  assert.match(read("app/vendor/dashboard/page.tsx"), /Sign out/);
});

test("listing detail page exposes conversion tools", () => {
  const source =
    read("app/listings/[id]/page.tsx") +
    read("app/listings/[id]/ListingConversionTools.tsx");

  assert.match(source, /ListingConversionTools/);
  assert.match(source, /Trust this listing/);
  assert.match(source, /Compare quickly/);
  assert.match(source, /Booking confidence/);
});

test("admin listings expose conversion score and quality checklist", () => {
  const source = read("app/admin/listings/page.tsx");

  assert.match(source, /Conversion score/);
  assert.match(source, /Quality checklist/);
});

test("vendor dashboard exposes a growth checklist", () => {
  const source = read("app/vendor/dashboard/page.tsx");

  assert.match(source, /Growth checklist/);
  assert.match(source, /Conversion score/);
});
