import assert from "node:assert/strict";
import test from "node:test";
import { getRoaVerifiedStatus } from "./roa-verified.ts";

const premiumListing = {
  id: "listing-1",
  vendor_id: "vendor-1",
  title: "Private West Bay Snorkel",
  description:
    "A private reef day with clear pickup, flexible pacing, calm snorkeling, and concierge-reviewed timing before the day is confirmed.",
  price: 250,
  location: "West Bay",
  image_url: "https://example.com/west-bay.jpg",
  gallery_image_urls: [],
  tour_times: ["9:00 AM", "1:30 PM"],
  latitude: 16.276,
  longitude: -86.598,
  max_guests: 6,
  rating: 5,
  reviews_count: 4,
};

test("marks complete premium listings as Roa Verified", () => {
  const status = getRoaVerifiedStatus(premiumListing, {
    id: "vendor-1",
    business_name: "Island Crew",
    is_active: true,
    is_verified: true,
  });

  assert.equal(status.label, "Roa Verified");
  assert.equal(status.score, 100);
  assert.equal(status.missingSignals.length, 0);
});

test("keeps incomplete listings in concierge review", () => {
  const status = getRoaVerifiedStatus({
    ...premiumListing,
    vendor_id: null,
    image_url: null,
    price: 999999,
    location: "",
    tour_times: [],
    latitude: null,
    longitude: null,
    max_guests: null,
    description: "Test",
  });

  assert.equal(status.label, "Concierge review");
  assert.ok(status.score < 50);
  assert.deepEqual(
    status.missingSignals.slice(0, 4).map((signal) => signal.key),
    ["operator", "media", "price", "location"],
  );
});

test("uses vendor verification as proof when reviews are not present", () => {
  const status = getRoaVerifiedStatus(
    { ...premiumListing, rating: null, reviews_count: 0 },
    { id: "vendor-1", is_verified: true },
  );

  assert.equal(
    status.completedSignals.some((signal) => signal.key === "reviews"),
    true,
  );
});
