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

test("vendor revenue kit surfaces revenue, tips, and public trust badges", () => {
  const vendorDashboard = readProjectFile("app/vendor/dashboard/page.tsx");
  const vendorProfile = readProjectFile("app/vendors/[id]/page.tsx");
  const listingPage = readProjectFile("app/listings/[id]/page.tsx");
  const vendorHelpers = readProjectFile("lib/vendor-dashboard.ts");

  assert.match(vendorDashboard, /Revenue kit/);
  assert.match(vendorDashboard, /Listing revenue score/);
  assert.match(vendorProfile, /Marketplace trust/);
  assert.match(listingPage, /Guest-ready listing/);
  assert.match(vendorHelpers, /getVendorRevenueSummary/);
});

test("admin revenue command center surfaces payouts and exports", () => {
  const adminDashboard = readProjectFile("app/admin/page.tsx");
  const exportButton = readProjectFile("app/admin/ExportCsvButton.tsx");
  const exportRoute = readProjectFile("app/api/admin/export/route.ts");

  assert.match(adminDashboard, /Admin Revenue Command Center/);
  assert.match(adminDashboard, /Vendor payout estimate/);
  assert.match(adminDashboard, /High-value trips/);
  assert.match(exportButton, /revenue/);
  assert.match(exportRoute, /buildAdminRevenueExportRows/);
});

test("vendor payout management surfaces admin controls and vendor visibility", () => {
  const adminBookings = readProjectFile("app/admin/bookings/page.tsx");
  const vendorDashboard = readProjectFile("app/vendor/dashboard/page.tsx");
  const vendorBookingsRoute = readProjectFile("app/api/vendor/bookings/route.ts");
  const exportButton = readProjectFile("app/admin/ExportCsvButton.tsx");
  const exportRoute = readProjectFile("app/api/admin/export/route.ts");
  const schema = readProjectFile("supabase/schema.sql");

  assert.match(adminBookings, /Vendor payout/);
  assert.match(adminBookings, /Payout note/);
  assert.match(vendorDashboard, /Payout tracker/);
  assert.match(vendorBookingsRoute, /payout_scheduled_for/);
  assert.match(exportButton, /vendor_payouts/);
  assert.match(exportRoute, /buildVendorPayoutExportRows/);
  assert.match(schema, /payout_scheduled_for/);
});

test("vendor payout statements include receipts, exports, and paid email flow", () => {
  const adminBookingRoute = readProjectFile("app/api/admin/bookings/[id]/route.ts");
  const adminRevenue = readProjectFile("lib/admin-revenue.ts");
  const vendorDashboard = readProjectFile("app/vendor/dashboard/page.tsx");
  const exportButton = readProjectFile("app/admin/ExportCsvButton.tsx");
  const exportRoute = readProjectFile("app/api/admin/export/route.ts");
  const adminDashboard = readProjectFile("app/admin/page.tsx");

  assert.match(adminRevenue, /getVendorPayoutStatements/);
  assert.match(adminRevenue, /getVendorPayoutReceipts/);
  assert.match(adminRevenue, /buildVendorPayoutReceiptEmail/);
  assert.match(vendorDashboard, /Payout statements/);
  assert.match(vendorDashboard, /Recent payout receipts/);
  assert.match(adminBookingRoute, /buildVendorPayoutReceiptEmail/);
  assert.match(adminBookingRoute, /Vendor payout paid email/);
  assert.match(exportButton, /vendor_payout_statements/);
  assert.match(exportRoute, /buildVendorPayoutStatementExportRows/);
  assert.match(adminDashboard, /vendor_payout_statements/);
});

test("booking change requests are available to guests, vendors, and admins", () => {
  const guestAccount = readProjectFile("app/account/page.tsx");
  const vendorDashboard = readProjectFile("app/vendor/dashboard/page.tsx");
  const adminBookings = readProjectFile("app/admin/bookings/page.tsx");
  const guestRoute = readProjectFile("app/api/bookings/[id]/change-requests/route.ts");
  const actionRoute = readProjectFile("app/api/booking-change-requests/[id]/route.ts");
  const vendorRoute = readProjectFile("app/api/vendor/bookings/route.ts");
  const schema = readProjectFile("supabase/schema.sql");

  assert.match(guestAccount, /Request changes/);
  assert.match(vendorDashboard, /Change requests/);
  assert.match(adminBookings, /Pending changes/);
  assert.match(guestRoute, /booking_change_requests/);
  assert.match(actionRoute, /applyApprovedChangeRequest/);
  assert.match(vendorRoute, /change_requests/);
  assert.match(schema, /booking_change_requests/);
});

test("availability protection uses vendor rules before booking submits", () => {
  const bookingForm = readProjectFile("app/book/BookingForm.tsx");
  const availabilityRoute = readProjectFile("app/api/availability/route.ts");
  const bookingRoute = readProjectFile("app/api/bookings/route.ts");
  const helper = readProjectFile("lib/booking-availability.ts");

  assert.match(bookingForm, /Available times/);
  assert.match(bookingForm, /Preferred time/);
  assert.match(bookingForm, /checkBookingAvailability/);
  assert.match(availabilityRoute, /checkBookingAvailability/);
  assert.match(bookingRoute, /checkBookingAvailability/);
  assert.match(bookingRoute, /tour_times/);
  assert.match(helper, /Please choose one of the available times/);
});

test("smart booking rules surface calendar, auto-confirm, and season controls", () => {
  const bookingForm = readProjectFile("app/book/BookingForm.tsx");
  const listingPage = readProjectFile("app/listings/[id]/page.tsx");
  const adminListings = readProjectFile("app/admin/listings/page.tsx");
  const vendorDashboard = readProjectFile("app/vendor/dashboard/page.tsx");
  const bookingRoute = readProjectFile("app/api/bookings/route.ts");
  const schema = readProjectFile("supabase/schema.sql");

  assert.match(bookingForm, /Availability calendar/);
  assert.match(listingPage, /Upcoming availability/);
  assert.match(adminListings, /Auto-confirm available bookings/);
  assert.match(vendorDashboard, /Private booking mode/);
  assert.match(vendorDashboard, /Available weekdays/);
  assert.match(bookingRoute, /shouldAutoConfirmBooking/);
  assert.match(schema, /auto_confirm_bookings/);
  assert.match(schema, /available_weekdays/);
});
