import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("app/page.tsx", "utf8");

test("homepage leads guests into a guided Roatan planning journey", () => {
  assert.match(source, /homepageControls\.primaryCtaLabel/);
  assert.match(source, /homepageControls\.secondaryCtaLabel/);
  assert.match(source, /homepageControls\.listingsTitle/);
  assert.match(source, /homepageControls\.finalCtaTitle/);
  assert.doesNotMatch(source, /Choose your Roatan style/);
  assert.doesNotMatch(source, /Trip planner/);
});

test("homepage listing cards use premium fallback imagery", () => {
  const listingCardSource = readFileSync("app/HomeListingCard.tsx", "utf8");

  assert.doesNotMatch(listingCardSource, /No image yet/);
  assert.doesNotMatch(listingCardSource, /Image coming soon/);
  assert.match(listingCardSource, /Roatan preview/);
});

test("homepage exposes clear trust signals before conversion", () => {
  const settingsSource = readFileSync("lib/homepage-settings.ts", "utf8");

  assert.match(source, /homepageControls\.trustPoints/);
  assert.match(settingsSource, /Verified local operators/);
  assert.match(settingsSource, /Secure request flow/);
});

test("homepage uses admin-editable copy controls", () => {
  assert.match(source, /homepageControls\.heroEyebrow/);
  assert.match(source, /homepageControls\.homepageHeadline/);
  assert.match(source, /homepageControls\.homepageSubhead/);
  assert.match(source, /homepageControls\.finalCtaTitle/);
});

test("homepage uses admin-editable visual, link, and section controls", () => {
  assert.match(source, /homepageControls\.heroImageUrl/);
  assert.match(source, /homepageControls\.primaryCtaHref/);
  assert.match(source, /homepageControls\.secondaryCtaHref/);
  assert.match(source, /homepageControls\.homepageFeaturedListingIds/);
  assert.match(source, /getVisibleHomepageSections/);
  assert.match(source, /renderHomepageSection/);
});

test("homepage removes repeated sections that made the page feel busy", () => {
  assert.doesNotMatch(source, /GuestMasterpieceSection/);
  assert.doesNotMatch(source, /BrandAbout/);
  assert.doesNotMatch(source, /TripPlannerDock/);
  assert.doesNotMatch(source, /audiencePaths/);
  assert.doesNotMatch(source, /luxuryJourneyCards/);
  assert.doesNotMatch(source, /categoryHighlights/);
  assert.doesNotMatch(source, /function ListingCard/);
  assert.match(source, /slice\(0, 3\)/);
});

test("homepage protects the luxury surface from rough listing data", () => {
  assert.match(source, /isShowcaseReadyListing/);
  assert.match(source, /showcaseListings/);
});
