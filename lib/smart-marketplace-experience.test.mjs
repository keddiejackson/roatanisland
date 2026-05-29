import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  applyTravelerPersonaToFilters,
  getLuxuryListingDetailProfile,
  getLuxuryMarketplaceMatch,
  getMarketplaceMatchBrief,
  getTravelerPersonaPresets,
  sortListingsForLuxuryMatch,
} from "./marketplace-upgrade.ts";

const root = new URL("../", import.meta.url);

function readProjectFile(path) {
  return readFileSync(new URL(path, root), "utf8");
}

const listings = [
  {
    id: "private-boat",
    title: "Private Sunset Boat",
    category: "Private Charters",
    location: "West End",
    description: "Luxury private charter with snorkel time and sunset finish.",
    price: 325,
    is_featured: true,
    rating: 5,
    reviews_count: 12,
    tour_times: ["4:30 PM"],
    max_guests: 6,
    latitude: 16.31,
    longitude: -86.59,
  },
  {
    id: "airport-transfer",
    title: "Airport Transfer",
    category: "Transport",
    location: "Roatan Airport",
    description: "Airport pickup with luggage-friendly private transfer.",
    price: 55,
    is_featured: false,
    rating: 4.8,
    reviews_count: 6,
    tour_times: ["Any time"],
    max_guests: 5,
    latitude: 16.32,
    longitude: -86.52,
  },
  {
    id: "family-beach",
    title: "Family Beach Day",
    category: "Tours",
    location: "West Bay",
    description: "Easy family beach plan with food nearby and gentle timing.",
    price: 95,
    is_featured: false,
    rating: 4.7,
    reviews_count: 3,
    tour_times: ["9:00 AM"],
    max_guests: 10,
    latitude: null,
    longitude: null,
  },
];

test("traveler persona presets include luxury, cruise, family, and airport planning", () => {
  const presets = getTravelerPersonaPresets();

  assert.deepEqual(
    presets.map((preset) => preset.id),
    ["luxury-private", "cruise-day", "family-easy", "arrival-transfer"],
  );
  assert.equal(presets[0].label, "Luxury private day");
  assert.ok(presets[0].searchTerms.includes("private"));
});

test("traveler persona presets apply useful marketplace filters", () => {
  assert.deepEqual(
    applyTravelerPersonaToFilters("arrival-transfer"),
    {
      search: "airport transfer",
      category: "Transport",
      location: "All",
      maxPrice: "",
      minimumRating: "4.5",
      sortBy: "Smart match",
      guestCount: "2",
      availableOnly: false,
    },
  );
});

test("luxury marketplace match scores listings with clear traveler reasons", () => {
  const match = getLuxuryMarketplaceMatch(listings[0], "luxury-private", {
    date: "2026-07-10",
    guests: "4",
  });

  assert.equal(match.label, "Excellent match");
  assert.equal(match.score, 100);
  assert.deepEqual(match.reasons.slice(0, 4), [
    "Private or VIP fit",
    "Sunset-friendly",
    "Premium price tier",
    "Open on your date",
  ]);
});

test("smart marketplace sorting puts the best persona match first", () => {
  assert.deepEqual(
    sortListingsForLuxuryMatch(listings, "arrival-transfer", {
      date: "",
      guests: "4",
    }).map((listing) => listing.id),
    ["airport-transfer", "private-boat", "family-beach"],
  );
});

test("marketplace match brief summarizes the search like a premium advisor", () => {
  assert.deepEqual(
    getMarketplaceMatchBrief({
      personaId: "family-easy",
      listings,
      date: "2026-07-10",
      guests: "4",
    }),
    {
      eyebrow: "Smart trip matching",
      title: "Best matches for Family easy day",
      body: "We ranked 3 live options using your travel style, date, guest count, location fit, trust signals, and booking clarity.",
      topReasons: ["Family-friendly", "Open on your date", "Fits 4 guests"],
    },
  );
});

test("luxury listing detail profile creates guest-facing planning sections", () => {
  assert.deepEqual(getLuxuryListingDetailProfile(listings[0]), {
    label: "Luxury private fit",
    summary:
      "Best for travelers who want a polished private Roatan day with clear timing, operator trust, and map context before requesting.",
    idealFor: ["Private day", "Sunset plan", "Premium experience"],
    serviceSignals: [
      "Private or charter-style experience",
      "Tour times published",
      "Verified review history",
      "Exact map context",
    ],
    planningNotes: [
      "Use this as an anchor stop, then compare nearby listings before requesting.",
      "Ask for pickup timing, weather backup, and final payment details before confirmation.",
      "Save or book this listing so messages stay connected to your trip dashboard.",
    ],
  });
});

test("smart marketplace UI sections are wired into public pages", () => {
  const homepage = readProjectFile("app/page.tsx");
  const listingPage = readProjectFile("app/listings/[id]/page.tsx");

  assert.match(homepage, /Smart trip matching/);
  assert.match(homepage, /Traveler style/);
  assert.match(homepage, /Why this matches/);
  assert.match(listingPage, /Private planning profile/);
  assert.match(listingPage, /Best for this trip/);
});
