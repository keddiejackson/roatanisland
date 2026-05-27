import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);

function readProjectFile(path) {
  return readFileSync(new URL(path, root), "utf8");
}

test("map listing cards expose quick trip and booking actions", () => {
  const source = readProjectFile("app/map/MapBrowser.tsx");

  assert.match(source, /Quick actions/);
  assert.match(source, /Save stop/);
  assert.match(source, /href=\{`\/book\?listing=\$\{pin\.id\}`\}/);
});

test("admin map cleanup includes priority filters", () => {
  const source = readProjectFile("app/admin/map-cleanup/page.tsx");

  assert.match(source, /Priority queue/);
  assert.match(source, /No photo/);
  assert.match(source, /No vendor/);
});

test("vendor profiles show stronger trust and listing context", () => {
  const source = readProjectFile("app/vendors/[id]/page.tsx");

  assert.match(source, /Vendor profile/);
  assert.match(source, /Profile at a glance/);
  assert.match(source, /Contact details shown/);
});

test("homepage and guest account surface clearer next steps", () => {
  const homepage = readProjectFile("app/page.tsx");
  const account = readProjectFile("app/account/page.tsx");

  assert.match(homepage, /Explore by category/);
  assert.match(account, /Trip dashboard/);
  assert.match(account, /Plan another trip/);
});

test("big upgrade surfaces brand media, guest reviews, and vendor focus", () => {
  const adminNav = readProjectFile("app/admin/AdminNav.tsx");
  const mediaPage = readProjectFile("app/admin/media/page.tsx");
  const account = readProjectFile("app/account/page.tsx");
  const vendorDashboard = readProjectFile("app/vendor/dashboard/page.tsx");
  const bookingFlow = readProjectFile("lib/booking-flow.ts");

  assert.match(adminNav, /\/admin\/media/);
  assert.match(mediaPage, /Brand media library/);
  assert.match(account, /Leave review/);
  assert.match(vendorDashboard, /highest-impact tasks/);
  assert.match(bookingFlow, /Share your review/);
  assert.match(readProjectFile("app/page.tsx"), /See all matches on the map/);
});

test("next upgrade surfaces planner, command, and readiness polish", () => {
  const homepage = readProjectFile("app/page.tsx");
  const tripDock = readProjectFile("app/TripPlannerDock.tsx");
  const adminDashboard = readProjectFile("app/admin/page.tsx");
  const vendorDashboard = readProjectFile("app/vendor/dashboard/page.tsx");
  const guestDashboard = readProjectFile(
    "app/account/GuestTravelCommandCenter.tsx",
  );

  assert.match(homepage, /Trip match brief/);
  assert.match(tripDock, /Planner progress/);
  assert.match(adminDashboard, /Operating digest/);
  assert.match(vendorDashboard, /Guest readiness/);
  assert.match(guestDashboard, /Next best step/);
});

test("booking conversion pro surfaces trust, readiness, and recovery polish", () => {
  const bookPage = readProjectFile("app/book/page.tsx");
  const bookingForm = readProjectFile("app/book/BookingForm.tsx");
  const successPage = readProjectFile("app/book/success/page.tsx");
  const bookingFlow = readProjectFile("lib/booking-flow.ts");

  assert.match(bookPage, /Why booking here works/);
  assert.match(bookingForm, /Booking readiness/);
  assert.match(bookingForm, /Optional upgrades/);
  assert.match(bookingForm, /Finish your request/);
  assert.match(successPage, /Confirmation checklist/);
  assert.match(bookingFlow, /Pay only when ready/);
});
