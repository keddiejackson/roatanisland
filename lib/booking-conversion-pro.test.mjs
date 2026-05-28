import assert from "node:assert/strict";
import test from "node:test";
import {
  buildListingComparisonFacts,
  getListingConversionScore,
  getListingConversionSummary,
  getListingTrustBadges,
  getVendorGrowthTasks,
} from "./booking-conversion-pro.ts";

const polishedListing = {
  id: "listing-1",
  vendor_id: "vendor-1",
  title: "Private West Bay Snorkel",
  description:
    "A polished private snorkel day with pickup details, reef stops, guest notes, and a clear plan for families.",
  price: 185,
  location: "West Bay",
  category: "Tours",
  image_url: "https://example.com/cover.jpg",
  gallery_image_urls: [
    "https://example.com/one.jpg",
    "https://example.com/two.jpg",
  ],
  tour_times: ["9:00 AM", "1:30 PM"],
  latitude: 16.276,
  longitude: -86.598,
  max_guests: 8,
  availability_note: "Runs daily when weather allows.",
  minimum_notice_hours: 24,
  reviews_count: 6,
  rating: 5,
  is_active: true,
};

test("scores a polished listing as conversion-ready", () => {
  const score = getListingConversionScore(polishedListing);

  assert.equal(score.score, 100);
  assert.equal(score.label, "Conversion-ready");
  assert.equal(score.incompleteItems.length, 0);
  assert.equal(score.nextBestAction, "Keep photos, times, and response speed fresh.");
});

test("surfaces the next best action for incomplete listings", () => {
  const score = getListingConversionScore({
    ...polishedListing,
    image_url: null,
    gallery_image_urls: [],
    tour_times: [],
    latitude: null,
    longitude: null,
    max_guests: null,
  });

  assert.equal(score.label, "Needs attention");
  assert.equal(score.incompleteItems[0].label, "Photos");
  assert.equal(score.nextBestAction, "Add strong photos or a gallery.");
});

test("builds traveler-facing trust badges", () => {
  const badges = getListingTrustBadges({
    listing: polishedListing,
    vendor: { is_verified: true, business_name: "Roatan Pro Tours" },
  });

  assert.deepEqual(
    badges.map((badge) => badge.label),
    [
      "Verified local operator",
      "Guest-ready listing",
      "Clear booking details",
      "Map-ready",
      "Reviewed request flow",
    ],
  );
});

test("builds comparison facts for saved and compared listings", () => {
  assert.deepEqual(buildListingComparisonFacts(polishedListing), [
    { label: "Area", value: "West Bay" },
    { label: "Category", value: "Tours" },
    { label: "Starting price", value: "$185" },
    { label: "Times", value: "9:00 AM, 1:30 PM" },
    { label: "Capacity", value: "Up to 8 guests" },
    { label: "Rating", value: "5/5 from 6 reviews" },
  ]);
});

test("summarizes admin conversion health", () => {
  const summary = getListingConversionSummary([
    polishedListing,
    {
      ...polishedListing,
      id: "listing-2",
      image_url: null,
      gallery_image_urls: [],
      tour_times: [],
      latitude: null,
      longitude: null,
      max_guests: null,
      is_active: false,
    },
  ]);

  assert.equal(summary.averageScore, 50);
  assert.equal(summary.readyCount, 1);
  assert.equal(summary.needsAttentionCount, 1);
  assert.equal(summary.topActionLabel, "Photos");
});

test("builds vendor growth tasks from listings", () => {
  const tasks = getVendorGrowthTasks({
    listings: [
      polishedListing,
      {
        ...polishedListing,
        id: "listing-2",
        image_url: null,
        gallery_image_urls: [],
      },
    ],
  });

  assert.equal(tasks[0].label, "Upgrade listing photos");
  assert.equal(tasks[0].count, 1);
});
