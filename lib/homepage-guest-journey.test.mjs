import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("app/page.tsx", "utf8");

test("homepage leads guests into a guided Roatan planning journey", () => {
  assert.match(source, /Plan your Roatan day/);
  assert.match(source, /Explore experiences/);
  assert.match(source, /Featured Roatan picks/);
  assert.match(source, /Ready to plan your Roatan day/);
  assert.doesNotMatch(source, /Choose your Roatan style/);
  assert.doesNotMatch(source, /Trip planner/);
});

test("homepage listing cards use premium fallback imagery", () => {
  const listingCardSource = readFileSync("app/HomeListingCard.tsx", "utf8");

  assert.doesNotMatch(listingCardSource, /No image yet/);
  assert.match(listingCardSource, /Image coming soon/);
});

test("homepage exposes clear trust signals before conversion", () => {
  const contentSource = readFileSync("lib/homepage-content.ts", "utf8");

  assert.match(source, /homepageTrustSignals/);
  assert.match(contentSource, /Verified local operators/);
  assert.match(contentSource, /Secure request flow/);
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
