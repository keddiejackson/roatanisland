import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getPremiumListingCardPolish } from "./marketplace-upgrade.ts";

test("builds premium public listing polish from trust and media signals", () => {
  const polished = getPremiumListingCardPolish({
    id: "listing-1",
    title: "Private Sunset Charter",
    description:
      "A private sunset cruise with flexible pacing, drinks, and West Bay pickup.",
    category: "Private Charters",
    location: "West Bay",
    price: 450,
    image_url: "https://example.com/charter.jpg",
    is_featured: true,
    rating: 4.9,
    reviews_count: 12,
    tour_times: ["4:30 PM Sunset Cruise"],
    max_guests: 8,
    latitude: 16.27,
    longitude: -86.59,
  });

  assert.equal(polished.imageLabel, "Premium photo ready");
  assert.equal(polished.priceLabel, "$450");
  assert.equal(polished.primaryBadge, "Guest-ready");
  assert.ok(polished.trustBadges.includes("Guest favorite"));
  assert.ok(polished.trustBadges.includes("Exact map pin"));
  assert.match(polished.benefitLine, /Private pacing/);
});

test("guides rough listings toward concierge-safe public copy", () => {
  const rough = getPremiumListingCardPolish({
    id: "listing-2",
    title: "test listing",
    description: "",
    category: "Tours",
    location: null,
    price: null,
    image_url: null,
    tour_times: [],
    latitude: null,
    longitude: null,
  });

  assert.equal(rough.imageLabel, "Premium photo pending");
  assert.equal(rough.priceLabel, "Request quote");
  assert.equal(rough.primaryBadge, "Needs media");
  assert.ok(rough.trustBadges.includes("Premium media needed"));
  assert.ok(rough.adminFlags.includes("media"));
  assert.ok(rough.adminFlags.includes("pricing"));
  assert.match(rough.benefitLine, /Concierge can confirm timing and pickup/);
});

test("premium trust polish is visible on public, admin, and vendor surfaces", () => {
  const homeCardSource = readFileSync("app/HomeListingCard.tsx", "utf8");
  const categorySource = readFileSync("app/category-page.tsx", "utf8");
  const mapSource = readFileSync("app/map/MapBrowser.tsx", "utf8");
  const adminQualitySource = readFileSync(
    "app/admin/listing-quality/page.tsx",
    "utf8",
  );
  const vendorAddListingSource = readFileSync(
    "app/vendor/add-listing/page.tsx",
    "utf8",
  );

  assert.match(homeCardSource, /getPremiumListingCardPolish/);
  assert.match(homeCardSource, /Premium photo pending/);
  assert.match(homeCardSource, /View details/);
  assert.doesNotMatch(homeCardSource, /Details coming soon/);
  assert.doesNotMatch(categorySource, /No image yet/);
  assert.doesNotMatch(mapSource, /No image yet/);
  assert.match(adminQualitySource, /Marketplace polish queue/);
  assert.match(adminQualitySource, /Needs trust/);
  assert.match(adminQualitySource, /Guest-facing fixes/);
  assert.match(vendorAddListingSource, /Guest trust tips/);
  assert.match(vendorAddListingSource, /Premium listing score/);
});
