import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultHomepageControls,
  getVisibleHomepageSections,
  normalizeHomepageControls,
} from "./homepage-settings.ts";

test("normalizes missing and malformed homepage controls to defaults", () => {
  const controls = normalizeHomepageControls({
    heroEyebrow: 123,
    showFeaturedListings: "yes",
    mapChips: "not an array",
    trustPoints: [{ title: "", text: "" }],
  });

  assert.equal(controls.heroEyebrow, defaultHomepageControls.heroEyebrow);
  assert.equal(controls.showFeaturedListings, true);
  assert.deepEqual(controls.mapChips, defaultHomepageControls.mapChips);
  assert.deepEqual(controls.trustPoints, defaultHomepageControls.trustPoints);
});

test("preserves legacy homepage headline and subhead settings", () => {
  const controls = normalizeHomepageControls({
    homepageHeadline: "  Custom island headline  ",
    homepageSubhead: "  Custom subhead  ",
  });

  assert.equal(controls.homepageHeadline, "Custom island headline");
  assert.equal(controls.homepageSubhead, "Custom subhead");
});

test("defaults homepage hero copy to the luxury homepage wording", () => {
  const controls = normalizeHomepageControls({});

  assert.equal(controls.heroEyebrow, "Private Roatan days");
  assert.equal(controls.homepageHeadline, "The island, arranged beautifully.");
  assert.equal(
    controls.homepageSubhead,
    "Plan your Roatan day with vetted local experiences, map context, and concierge help in one calm place.",
  );
  assert.equal(controls.primaryCtaLabel, "Plan your Roatan day");
  assert.equal(controls.secondaryCtaLabel, "Explore experiences");
});

test("normalizes the editable final homepage call to action", () => {
  const controls = normalizeHomepageControls({
    finalCtaEyebrow: "  Last step  ",
    finalCtaTitle: "  Book your perfect day  ",
    finalCtaBody: "  Start from the map or ask for help.  ",
    finalCtaPrimaryLabel: "  Open the map  ",
    finalCtaSecondaryLabel: "  Help me plan  ",
    finalCtaTertiaryLabel: "  My dashboard  ",
  });

  assert.equal(controls.finalCtaEyebrow, "Last step");
  assert.equal(controls.finalCtaTitle, "Book your perfect day");
  assert.equal(controls.finalCtaBody, "Start from the map or ask for help.");
  assert.equal(controls.finalCtaPrimaryLabel, "Open the map");
  assert.equal(controls.finalCtaSecondaryLabel, "Help me plan");
  assert.equal(controls.finalCtaTertiaryLabel, "My dashboard");
});

test("normalizes homepage image, link, section, and featured listing controls", () => {
  const controls = normalizeHomepageControls({
    heroImageUrl: "  https://example.com/hero.jpg  ",
    listingFallbackImageUrl: "  /images/custom-fallback.jpg  ",
    finalCtaImageUrl: "  javascript:alert(1)  ",
    primaryCtaHref: "  /map  ",
    secondaryCtaHref: "javascript:bad()",
    finalCtaPrimaryHref: "  https://example.com/planner  ",
    finalCtaSecondaryHref: "mailto:hello@example.com",
    finalCtaTertiaryHref: "tel:+50400000000",
    showFinalCta: false,
    sectionOrder: ["finalCta", "unknown", "marketplace", "trustBar"],
    homepageFeaturedListingIds: [" one ", "", 42, "two"],
  });

  assert.equal(controls.heroImageUrl, "https://example.com/hero.jpg");
  assert.equal(controls.listingFallbackImageUrl, "/images/custom-fallback.jpg");
  assert.equal(controls.finalCtaImageUrl, "");
  assert.equal(controls.primaryCtaHref, "/map");
  assert.equal(controls.secondaryCtaHref, defaultHomepageControls.secondaryCtaHref);
  assert.equal(controls.finalCtaPrimaryHref, "https://example.com/planner");
  assert.equal(controls.finalCtaSecondaryHref, "mailto:hello@example.com");
  assert.equal(controls.finalCtaTertiaryHref, "tel:+50400000000");
  assert.equal(controls.showFinalCta, false);
  assert.deepEqual(controls.sectionOrder, ["finalCta", "marketplace", "trustBar"]);
  assert.deepEqual(controls.homepageFeaturedListingIds, ["one", "two"]);
});

test("returns visible homepage sections in admin controlled order", () => {
  const controls = normalizeHomepageControls({
    sectionOrder: ["finalCta", "marketplace", "trustBar"],
    showTrustSection: false,
    showFeaturedListings: true,
    showFinalCta: true,
  });

  assert.deepEqual(getVisibleHomepageSections(controls), [
    "finalCta",
    "marketplace",
  ]);
});

test("legacy default homepage copy upgrades to current luxury copy", () => {
  const controls = normalizeHomepageControls({
    heroEyebrow: "Roatan experiences",
    homepageHeadline: "Plan your best Roatan day in one place.",
    homepageSubhead:
      "Browse local experiences, compare prices, and request bookings from a simple island directory built for travelers.",
    primaryCtaLabel: "Explore listings",
    secondaryCtaLabel: "View map",
  });

  assert.equal(controls.heroEyebrow, "Private Roatan days");
  assert.equal(controls.homepageHeadline, "The island, arranged beautifully.");
  assert.equal(controls.primaryCtaLabel, "Plan your Roatan day");
  assert.equal(controls.secondaryCtaLabel, "Explore experiences");
});

test("keeps explicit disabled section toggles", () => {
  const controls = normalizeHomepageControls({
    showFeaturedListings: false,
    showExploreRoutes: false,
    showMapCallout: false,
    showTrustSection: false,
    showPlanningHelp: false,
  });

  assert.equal(controls.showFeaturedListings, false);
  assert.equal(controls.showExploreRoutes, false);
  assert.equal(controls.showMapCallout, false);
  assert.equal(controls.showTrustSection, false);
  assert.equal(controls.showPlanningHelp, false);
});

test("filters blank chips and trust points while keeping useful rows", () => {
  const controls = normalizeHomepageControls({
    mapChips: [" Airport pickup ", "", "Cruise timing"],
    planningChips: ["", " Private day "],
    trustPoints: [
      { title: " Local help ", text: " Good planning context " },
      { title: "", text: "Missing title" },
      { title: "Missing text", text: "" },
    ],
  });

  assert.deepEqual(controls.mapChips, ["Airport pickup", "Cruise timing"]);
  assert.deepEqual(controls.planningChips, ["Private day"]);
  assert.deepEqual(controls.trustPoints, [
    { title: "Local help", text: "Good planning context" },
  ]);
});

test("empty public text fields fall back to safe copy", () => {
  const controls = normalizeHomepageControls({
    primaryCtaLabel: "   ",
    secondaryCtaLabel: "",
    featuredBadgeLabel: "",
    topRatedBadgeLabel: "   ",
  });

  assert.equal(controls.primaryCtaLabel, defaultHomepageControls.primaryCtaLabel);
  assert.equal(
    controls.secondaryCtaLabel,
    defaultHomepageControls.secondaryCtaLabel,
  );
  assert.equal(controls.featuredBadgeLabel, "Featured");
  assert.equal(controls.topRatedBadgeLabel, "Top rated");
});
