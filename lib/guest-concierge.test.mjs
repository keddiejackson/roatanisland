import assert from "node:assert/strict";
import test from "node:test";
import {
  buildConciergePlan,
  buildPlanShareUrl,
  getConciergeMatches,
  getGuestDashboardSummary,
  serializePlanForConciergeLead,
} from "./guest-concierge.ts";

const listings = [
  {
    id: "cruise-tour",
    title: "Cruise Port Island Tour",
    category: "Tours",
    location: "Coxen Hole",
    description: "Cruise port friendly island highlights with beach time.",
    price: 85,
    rating: 4.9,
    reviews_count: 18,
    tour_times: ["9:00 AM", "1:00 PM"],
    max_guests: 8,
  },
  {
    id: "private-boat",
    title: "Private Sunset Boat",
    category: "Private Charters",
    location: "West End",
    description: "Luxury private sunset charter for couples and groups.",
    price: 325,
    rating: 5,
    reviews_count: 9,
    tour_times: ["4:30 PM"],
    max_guests: 6,
  },
  {
    id: "airport-transfer",
    title: "Airport Transfer",
    category: "Transport",
    location: "Roatan Airport",
    description: "Airport pickup and luggage friendly transfer.",
    price: 45,
    rating: 4.7,
    reviews_count: 4,
    tour_times: ["Any time"],
    max_guests: 5,
  },
];

test("matches listings to cruise concierge preferences", () => {
  const matches = getConciergeMatches(listings, {
    arrivalType: "Cruise",
    pickupArea: "Coxen Hole",
    tripStyle: "Family",
    budget: "Moderate",
    guests: "4",
    interests: ["beach", "cruise"],
  });

  assert.equal(matches[0].listing.id, "cruise-tour");
  assert.ok(matches[0].reasons.includes("Cruise friendly"));
  assert.ok(matches[0].score > matches[1].score);
});

test("builds a timeline plan from matched listings", () => {
  const plan = buildConciergePlan({
    name: "Cruise Day",
    date: "2026-07-10",
    guests: "4",
    pickupArea: "Coxen Hole",
    arrivalType: "Cruise",
    matches: getConciergeMatches(listings, {
      arrivalType: "Cruise",
      pickupArea: "Coxen Hole",
      tripStyle: "Family",
      budget: "Moderate",
      guests: "4",
      interests: ["beach", "cruise"],
    }),
  });

  assert.equal(plan.name, "Cruise Day");
  assert.equal(plan.stops.length, 3);
  assert.deepEqual(plan.stops.map((stop) => stop.timeBlock), [
    "Morning",
    "Midday",
    "Afternoon",
  ]);
  assert.equal(plan.stops[0].listingId, "cruise-tour");
});

test("summarizes guest dashboard activity", () => {
  assert.deepEqual(
    getGuestDashboardSummary({
      bookings: [
        { id: "b1", status: "new", tour_date: "2026-07-10" },
        { id: "b2", status: "confirmed", tour_date: "2026-07-11" },
      ],
      plans: [
        { id: "p1", name: "Cruise Day", stops: [{ listingId: "cruise-tour" }] },
      ],
      profileComplete: true,
    }),
    {
      bookingCount: 2,
      confirmedCount: 1,
      planCount: 1,
      savedStopCount: 1,
      profileLabel: "Ready",
      nextDate: "2026-07-10",
    },
  );
});

test("serializes a plan for concierge lead emails", () => {
  const message = serializePlanForConciergeLead({
    name: "Cruise Day",
    date: "2026-07-10",
    guests: "4",
    pickupArea: "Coxen Hole",
    arrivalType: "Cruise",
    notes: "Need to be back by 3 PM.",
    stops: [
      {
        listingId: "cruise-tour",
        title: "Cruise Port Island Tour",
        timeBlock: "Morning",
        note: "First stop",
      },
    ],
  });

  assert.match(message, /Cruise Day/);
  assert.match(message, /Need to be back by 3 PM/);
  assert.match(message, /Morning: Cruise Port Island Tour/);
});

test("creates share URL from stop IDs", () => {
  assert.equal(
    buildPlanShareUrl({
      origin: "https://www.roatanisland.life",
      stopIds: ["cruise-tour", "private-boat"],
    }),
    "https://www.roatanisland.life/map?trip=cruise-tour%2Cprivate-boat",
  );
});
