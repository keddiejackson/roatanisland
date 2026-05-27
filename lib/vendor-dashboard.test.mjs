import assert from "node:assert/strict";
import test from "node:test";
import {
  getVendorFocusItems,
  getListingReadinessSummary,
  getListingRevenueKit,
  getListingStatusSummary,
  getPublicVendorTrustBadges,
  getProfileCompletionItems,
  getVendorDashboardStats,
  getVendorRevenueSummary,
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

test("summarizes listing readiness for public conversion", () => {
  assert.deepEqual(
    getListingReadinessSummary({
      image_url: "https://example.com/photo.jpg",
      gallery_image_urls: ["https://example.com/two.jpg"],
      tour_times: ["9:00 AM"],
      latitude: 16.27,
      longitude: -86.59,
      max_guests: 6,
      availability_note: "Runs daily.",
    }),
    {
      score: 100,
      label: "Guest-ready",
      missingItems: [],
    },
  );

  assert.deepEqual(
    getListingReadinessSummary({
      image_url: null,
      gallery_image_urls: [],
      tour_times: [],
      latitude: null,
      longitude: null,
      max_guests: null,
      availability_note: null,
    }),
    {
      score: 0,
      label: "Needs basics",
      missingItems: [
        "Add photos",
        "Add tour times",
        "Set a map pin",
        "Set max guests",
        "Add availability note",
      ],
    },
  );
});

test("summarizes vendor revenue from booking values and add-ons", () => {
  const summary = getVendorRevenueSummary({
    bookings: [
      {
        id: "b1",
        listing_id: "live",
        status: "confirmed",
        booking_value_cents: 18000,
        selected_addons: [{ name: "Lunch", price_cents: 2500 }],
      },
      {
        id: "b2",
        listing_id: "live",
        status: "new",
        booking_value_cents: 9000,
        selected_addons: [
          { name: "Lunch", price_cents: 2500 },
          { name: "Pickup", price_cents: 1500 },
        ],
      },
      {
        id: "b3",
        listing_id: "other",
        status: "cancelled",
        booking_value_cents: 50000,
        selected_addons: [{ name: "Pickup", price_cents: 1500 }],
      },
    ],
  });

  assert.deepEqual(summary, {
    grossBookingValueCents: 27000,
    confirmedValueCents: 18000,
    pendingValueCents: 9000,
    averageBookingValueCents: 13500,
    addonRevenueCents: 6500,
    topAddonLabel: "Lunch",
    upcomingConfirmedCount: 1,
    label: "$270 total request value",
  });
});

test("builds listing revenue kit tips from readiness, bookings, and add-ons", () => {
  assert.deepEqual(
    getListingRevenueKit({
      listing: {
        ...liveListing,
        max_guests: 8,
        availability_note: "Runs daily.",
      },
      bookings: [
        { id: "b1", listing_id: "live", status: "confirmed", booking_value_cents: 16000 },
        { id: "b2", listing_id: "live", status: "new", booking_value_cents: 12000 },
      ],
      addons: [
        { id: "a1", listing_id: "live", name: "Lunch", price_cents: 2500 },
      ],
    }),
    {
      score: 100,
      label: "Revenue-ready",
      bookingValueCents: 28000,
      requestCount: 2,
      addonCount: 1,
      tips: ["Keep response time fast to earn repeat requests."],
    },
  );

  assert.deepEqual(
    getListingRevenueKit({
      listing: {
        id: "draft",
        is_active: false,
        image_url: null,
        gallery_image_urls: [],
        tour_times: [],
        latitude: null,
        longitude: null,
        max_guests: null,
        availability_note: null,
      },
      bookings: [],
      addons: [],
    }).tips.slice(0, 4),
    [
      "Add photos",
      "Add tour times",
      "Set a map pin",
      "Add at least one paid add-on",
    ],
  );
});

test("builds public vendor trust badges from profile and listing quality", () => {
  assert.deepEqual(
    getPublicVendorTrustBadges({
      isVerified: true,
      publicContactCount: 2,
      listings: [
        {
          image_url: "https://example.com/photo.jpg",
          tour_times: ["9:00 AM"],
          latitude: 16.27,
          longitude: -86.59,
          max_guests: 6,
          availability_note: "Runs daily.",
        },
      ],
    }),
    ["Verified vendor", "Guest-ready listing", "Clear contact", "Map-ready"],
  );
});

test("builds vendor focus items from responses, profile gaps, and listings", () => {
  const profileItems = [
    { label: "Profile picture", complete: true, text: "Done" },
    { label: "Tour times added", complete: false, text: "Add times." },
  ];

  const focusItems = getVendorFocusItems({
    stats: {
      newBookings: 2,
      confirmedBookings: 1,
      liveListings: 0,
      reviewListings: 1,
    },
    needsResponseCount: 3,
    profileCompletionItems: profileItems,
  });

  assert.deepEqual(
    focusItems.map((item) => [item.label, item.value, item.href]),
    [
      ["Reply to guests", "3", "#bookings"],
      ["Finish setup", "1", "#profile"],
      ["Get a listing live", "0", "#listings"],
    ],
  );
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
