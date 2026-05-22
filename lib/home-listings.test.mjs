import assert from "node:assert/strict";
import test from "node:test";
import {
  filterHomeListings,
  homeListingFilterDefaults,
  selectHomeSpotlightListings,
} from "./home-listings.ts";

const listings = [
  {
    id: "featured-tour",
    title: "Sunset Charter",
    description: "Private west end water time",
    price: 180,
    location: "West End",
    category: "Private Charters",
    is_featured: true,
    rating: 4.9,
    tour_times: ["4:30 PM"],
  },
  {
    id: "reef-tour",
    title: "Family Reef Tour",
    description: "Easy snorkeling",
    price: 70,
    location: "West Bay",
    category: "Tours",
    is_featured: false,
    rating: 4.4,
    tour_times: ["9:00 AM"],
  },
  {
    id: "hotel",
    title: "Harbour Stay",
    description: "Mid-island hotel",
    price: 220,
    location: "French Harbour",
    category: "Hotels",
    is_featured: false,
    rating: 5,
    tour_times: [],
  },
];

test("filters homepage listings by the calm and advanced controls", () => {
  const rows = filterHomeListings(listings, {
    ...homeListingFilterDefaults,
    search: "reef 9:00",
    category: "Tours",
    location: "West Bay",
    maxPrice: "100",
    minimumRating: "4",
    sortBy: "Rating",
  });

  assert.deepEqual(
    rows.map((listing) => listing.id),
    ["reef-tour"],
  );
});

test("spotlight listings prefer featured rows and fall back to visible rows", () => {
  assert.deepEqual(
    selectHomeSpotlightListings(listings, listings).map((listing) => listing.id),
    ["featured-tour"],
  );

  assert.deepEqual(
    selectHomeSpotlightListings(
      listings.map((listing) => ({ ...listing, is_featured: false })),
      listings,
    ).map((listing) => listing.id),
    ["featured-tour", "reef-tour", "hotel"],
  );
});
