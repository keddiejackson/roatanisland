import assert from "node:assert/strict";
import test from "node:test";
import {
  getListingStatusSummary,
  getProfileCompletionItems,
  getVendorDashboardStats,
  sortVendorBookings,
} from "./vendor-dashboard.ts";

const baseProfile = {
  businessName: "Island Tours",
  phone: "555-1111",
  website: "https://example.com",
  profileImageUrl: "https://example.com/logo.jpg",
};

const liveListing = {
  id: "live",
  is_active: true,
  approval_status: "approved",
  tour_times: ["9:00 AM"],
  gallery_image_urls: ["https://example.com/1.jpg"],
  image_url: "https://example.com/cover.jpg",
  latitude: 16.31,
  longitude: -86.55,
};

test("summarizes listing status for live, rejected, and review states", () => {
  assert.deepEqual(getListingStatusSummary(liveListing), {
    label: "Live",
    tone: "live",
    text: "Guests can see and book this listing.",
  });

  assert.equal(
    getListingStatusSummary({
      ...liveListing,
      is_active: false,
      approval_status: "rejected",
    }).label,
    "Needs changes",
  );

  assert.equal(
    getListingStatusSummary({
      ...liveListing,
      is_active: false,
      approval_status: "pending",
    }).label,
    "Waiting for review",
  );
});

test("builds a vendor profile completion checklist", () => {
  const items = getProfileCompletionItems({
    profile: { ...baseProfile, phone: "", website: "" },
    listings: [
      {
        ...liveListing,
        tour_times: [],
        latitude: null,
        longitude: null,
      },
    ],
    documents: [],
  });

  assert.deepEqual(
    items.map((item) => [item.label, item.complete]),
    [
      ["Profile picture", true],
      ["Phone or website", false],
      ["At least one listing", true],
      ["Tour times added", false],
      ["Map pin added", false],
      ["Documents uploaded", false],
      ["Listing approved", true],
    ],
  );
});

test("computes vendor dashboard stats", () => {
  const stats = getVendorDashboardStats({
    bookings: [
      { id: "1", status: "new" },
      { id: "2", status: "confirmed" },
      { id: "3", status: "cancelled" },
    ],
    listings: [
      liveListing,
      { ...liveListing, id: "pending", is_active: false },
    ],
  });

  assert.deepEqual(stats, {
    newBookings: 1,
    confirmedBookings: 1,
    liveListings: 1,
    reviewListings: 1,
  });
});

test("sorts vendor bookings with new requests first, then date and time", () => {
  const bookings = [
    { id: "late", status: "confirmed", tour_date: "2026-06-02", tour_time: "4:00 PM" },
    { id: "new-later", status: "new", tour_date: "2026-06-03", tour_time: "9:00 AM" },
    { id: "new-soon", status: "new", tour_date: "2026-06-01", tour_time: "10:00 AM" },
  ];

  assert.deepEqual(
    sortVendorBookings(bookings).map((booking) => booking.id),
    ["new-soon", "new-later", "late"],
  );
});
