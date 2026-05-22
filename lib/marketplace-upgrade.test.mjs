import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDateAwareMapUrl,
  getListingTrustBadges,
  getMarketplaceCommandCenter,
  getMonthCalendarDays,
  listingMatchesAvailability,
} from "./marketplace-upgrade.ts";

const listing = {
  id: "listing-1",
  title: "Island Day",
  category: "Tours",
  location: "West Bay",
  tour_times: ["9:00 AM", "1:00 PM"],
  blocked_dates: ["2026-06-15"],
  max_guests: 6,
  is_featured: true,
  rating: 4.9,
  reviews_count: 12,
  latitude: 16.27,
  longitude: -86.59,
};

test("filters listings by date, time, and guest count", () => {
  assert.equal(
    listingMatchesAvailability(listing, {
      date: "2026-06-15",
      time: "9:00 AM",
      guests: "2",
      availableOnly: true,
    }),
    false,
  );

  assert.equal(
    listingMatchesAvailability(listing, {
      date: "2026-06-16",
      time: "4:00 PM",
      guests: "2",
      availableOnly: true,
    }),
    false,
  );

  assert.equal(
    listingMatchesAvailability(listing, {
      date: "2026-06-16",
      time: "9:00 AM",
      guests: "7",
      availableOnly: true,
    }),
    false,
  );

  assert.equal(
    listingMatchesAvailability(listing, {
      date: "2026-06-16",
      time: "9:00 AM",
      guests: "4",
      availableOnly: true,
    }),
    true,
  );
});

test("creates date-aware map URLs without empty params", () => {
  assert.equal(
    buildDateAwareMapUrl({
      category: "Tours",
      location: "West Bay",
      date: "2026-06-16",
      time: "",
      guests: "4",
      availableOnly: true,
    }),
    "/map?category=Tours&area=West+Bay&date=2026-06-16&guests=4&available=1",
  );
});

test("creates trust badges from listing quality signals", () => {
  assert.deepEqual(getListingTrustBadges(listing).slice(0, 3), [
    "Featured",
    "Top rated",
    "Verified reviews",
  ]);
});

test("summarizes marketplace command center priorities", () => {
  assert.deepEqual(
    getMarketplaceCommandCenter({
      listings: [
        listing,
        {
          ...listing,
          id: "listing-2",
          is_active: false,
          is_featured: false,
          rating: 0,
          reviews_count: 0,
          latitude: null,
          longitude: null,
        },
      ],
      bookings: [
        { id: "b1", status: "new", tour_date: "2026-06-10", guests: 2 },
        { id: "b2", status: "confirmed", tour_date: "2026-06-11", guests: 4 },
      ],
      vendors: [{ id: "v1", is_active: true }],
      reviews: [{ id: "r1", is_approved: false }],
    }).priorityCards.map((card) => [card.label, card.value]),
    [
      ["Needs review", 1],
      ["Missing map pins", 1],
      ["Missing reviews", 1],
      ["Unconfirmed bookings", 1],
    ],
  );
});

test("builds a month calendar with blocked and booked days", () => {
  const days = getMonthCalendarDays({
    month: "2026-06",
    blockedDates: ["2026-06-15"],
    bookings: [
      { id: "b1", tour_date: "2026-06-15", guests: 2 },
      { id: "b2", tour_date: "2026-06-16", guests: 3 },
    ],
  });

  assert.equal(days.length, 30);
  assert.deepEqual(
    days
      .filter((day) => day.date === "2026-06-15" || day.date === "2026-06-16")
      .map((day) => [day.date, day.isBlocked, day.bookingCount, day.guestCount]),
    [
      ["2026-06-15", true, 1, 2],
      ["2026-06-16", false, 1, 3],
    ],
  );
});
