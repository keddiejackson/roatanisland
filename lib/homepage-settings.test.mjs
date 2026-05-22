import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultHomepageControls,
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
