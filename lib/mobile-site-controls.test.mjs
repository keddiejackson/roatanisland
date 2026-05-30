import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  defaultMobileSiteControls,
  mobileNavItemKeys,
  normalizeMobileSiteControls,
} from "./mobile-site-controls.ts";

test("normalizes mobile control copy and toggles", () => {
  const controls = normalizeMobileSiteControls({
    mobileHeroHeadline: "  Island day  ",
    mobileNavMapLabel: "",
    showMobileHomepageSearch: false,
    showMobileFinalCta: "nope",
    useMobileLogoOverrides: true,
    mobileLogoWidthPx: "360",
    mobileLogoFit: "cover",
    mobileLogoBackgroundColor: "transparent",
  });

  assert.equal(controls.mobileHeroHeadline, "Island day");
  assert.equal(
    controls.mobileNavMapLabel,
    defaultMobileSiteControls.mobileNavMapLabel,
  );
  assert.equal(controls.showMobileHomepageSearch, false);
  assert.equal(
    controls.showMobileFinalCta,
    defaultMobileSiteControls.showMobileFinalCta,
  );
  assert.equal(controls.useMobileLogoOverrides, true);
  assert.equal(controls.mobileLogoWidthPx, 360);
  assert.equal(controls.mobileLogoFit, "cover");
  assert.equal(controls.mobileLogoBackgroundColor, "transparent");
});

test("keeps mobile nav keys stable for admin controls", () => {
  assert.deepEqual([...mobileNavItemKeys], [
    "listings",
    "map",
    "concierge",
    "signIn",
    "business",
  ]);
});

test("wires mobile controls into the main guest surfaces", () => {
  const files = [
    ["app/admin/settings/page.tsx", /Mobile Site Controls/],
    ["app/admin/settings/page.tsx", /mobileTextFields/],
    ["app/page.tsx", /mobileControls\.mobileHeroHeadline/],
    ["app/listings/[id]/page.tsx", /mobileControls\.mobileListingStickyCtaLabel/],
    ["app/book/page.tsx", /mobileControls\.mobileBookingHeroTitle/],
    ["app/book/BookingForm.tsx", /mobileControls\.mobileBookingSubmitLabel/],
    ["app/account/page.tsx", /mobileControls\.mobileAccountHeadline/],
    ["app/BookingChatDrawer.tsx", /mobileControls\.mobileChatBubbleLabel/],
    ["app/SiteLogo.tsx", /mobileControls\.useMobileLogoOverrides/],
  ];

  for (const [file, pattern] of files) {
    const contents = fs.readFileSync(file, "utf8");
    assert.match(contents, pattern, file);
  }
});
