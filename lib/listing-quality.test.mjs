import assert from "node:assert/strict";
import test from "node:test";
import {
  getListingQualitySummary,
  getListingQualityIssues,
  isShowcaseReadyListing,
  sortListingsByQuality,
} from "./listing-quality.ts";

const polishedListing = {
  id: "listing-1",
  vendor_id: "vendor-1",
  title: "Private West Bay Snorkel",
  description:
    "A private reef day with pickup details, clear timing, local guide notes, and a calm route for families and small groups.",
  price: 185,
  location: "West Bay",
  category: "Tours",
  image_url: "https://example.com/cover.jpg",
  gallery_image_urls: ["https://example.com/one.jpg"],
  tour_times: ["9:00 AM", "1:30 PM"],
  latitude: 16.276,
  longitude: -86.598,
  is_active: true,
};

test("marks polished listings as homepage showcase ready", () => {
  const summary = getListingQualitySummary(polishedListing);

  assert.equal(summary.score, 100);
  assert.equal(summary.label, "Showcase ready");
  assert.equal(isShowcaseReadyListing(polishedListing), true);
});

test("blocks test-like listings from the premium homepage showcase", () => {
  const roughListing = {
    ...polishedListing,
    title: "t4",
    description: "t4",
    price: 999975,
    location: `16\u00b021'17.1"N 86\u00b027'15.0"W`,
    image_url: null,
    gallery_image_urls: [],
  };
  const issues = getListingQualityIssues(roughListing).map((issue) => issue.code);

  assert.equal(isShowcaseReadyListing(roughListing), false);
  assert.deepEqual(
    issues.filter((issue) =>
      [
        "test_like_title",
        "short_description",
        "extreme_price",
        "coordinate_location",
        "missing_photo",
      ].includes(issue),
    ),
    [
      "test_like_title",
      "short_description",
      "extreme_price",
      "coordinate_location",
      "missing_photo",
    ],
  );
});

test("sorts the weakest listings to the top for admin cleanup", () => {
  const listings = [
    polishedListing,
    { ...polishedListing, id: "listing-2", title: "Show me the money", price: 100000 },
    { ...polishedListing, id: "listing-3", image_url: null, gallery_image_urls: [] },
  ];

  assert.equal(sortListingsByQuality(listings)[0].id, "listing-2");
});
