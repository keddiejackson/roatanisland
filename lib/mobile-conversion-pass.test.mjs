import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

test("homepage listing cards have phone-first booking actions", () => {
  const source = read("app/HomeListingCard.tsx");

  assert.match(source, /href=\{`\/book\?listing=\$\{listing\.id\}`\}/);
  assert.match(source, /Details/);
  assert.match(source, /Request/);
  assert.match(source, /grid grid-cols-2 gap-2 sm:hidden/);
});

test("booking flow hides dense panels behind mobile summaries", () => {
  const source = read("app/book/BookingForm.tsx");

  assert.match(source, /How the request works/);
  assert.match(source, /Confidence and payment checks/);
  assert.match(source, /hidden h-fit rounded-\[2rem\]/);
  assert.match(source, /hidden gap-3 sm:grid/);
});

test("map page uses compact mobile planning controls", () => {
  const mapPage = read("app/map/page.tsx");
  const mapBrowser = read("app/map/MapBrowser.tsx");

  assert.match(mapPage, /Airport/);
  assert.match(mapPage, /Cruise/);
  assert.match(mapPage, /Beach/);
  assert.match(mapBrowser, /Choose a day style/);
  assert.match(mapBrowser, /grid grid-cols-2 gap-2 sm:hidden/);
});

test("guest account keeps dense trip guidance off the first phone view", () => {
  const source = read("app/account/page.tsx");

  assert.match(source, /hidden rounded-xl border border-\[#00A8A8\]\/15/);
  assert.match(source, /mt-6 rounded-\[1\.5rem\] bg-white p-4/);
  assert.match(source, /mt-2 hidden text-sm leading-6 text-gray-600 sm:block/);
});

test("admin mobile settings include a realistic phone preview", () => {
  const source = read("app/admin/settings/page.tsx");

  assert.match(source, /Phone preview/);
  assert.match(source, /mobileListingsSearchPlaceholder/);
  assert.match(source, /mobileLogoPreviewBranding\.logoUrl/);
});
