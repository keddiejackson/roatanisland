import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("mobile foundation utilities are available globally", () => {
  const css = source("app/globals.css");

  assert.match(css, /\.mobile-scroll-row/);
  assert.match(css, /\.mobile-safe-bottom/);
  assert.match(css, /font-size: 16px/);
  assert.match(css, /scrollbar-width: none/);
});

test("public pages use phone-first navigation and compact spacing", () => {
  const homeHeader = source("app/HomeHeroHeader.tsx");
  const homePage = source("app/page.tsx");
  const mapPage = source("app/map/MapBrowser.tsx");
  const categoryPage = source("app/category-page.tsx");
  const footer = source("app/SiteFooter.tsx");

  assert.match(homeHeader, /mobile-scroll-row/);
  assert.doesNotMatch(homeHeader, /grid grid-cols-4/);
  assert.match(homePage, /sm:min-h-\[820px\]/);
  assert.match(homePage, /tracking-\[0\.28em\]/);
  assert.match(mapPage, /mobile-scroll-row/);
  assert.match(categoryPage, /brand-hero-panel/);
  assert.match(footer, /mobile-scroll-row/);
});

test("global floating controls respect mobile safe areas", () => {
  const accountButton = source("app/GlobalAccountButton.tsx");
  const chatDrawer = source("app/BookingChatDrawer.tsx");

  assert.match(accountButton, /max-w-\[calc\(100vw-1rem\)\]/);
  assert.match(chatDrawer, /left-3 right-3/);
  assert.match(chatDrawer, /mobile-safe-bottom/);
});

test("operator dashboards keep wide tables off phones", () => {
  const adminBookings = source("app/admin/bookings/page.tsx");
  const vendorDashboard = source("app/vendor/dashboard/page.tsx");

  assert.match(adminBookings, /hidden md:block/);
  assert.match(vendorDashboard, /hidden md:block/);
});

test("operator booking calendars expose mobile control centers", () => {
  const adminBookings = source("app/admin/bookings/page.tsx");
  const vendorDashboard = source("app/vendor/dashboard/page.tsx");

  assert.match(adminBookings, /Mobile booking command/);
  assert.match(adminBookings, /Money controls/);
  assert.match(adminBookings, /Payout controls/);
  assert.match(adminBookings, /Send payment request/);
  assert.match(vendorDashboard, /Mobile booking command/);
  assert.match(vendorDashboard, /Guest response/);
  assert.match(vendorDashboard, /Suggest time/);
  assert.match(vendorDashboard, /Open thread/);
});
