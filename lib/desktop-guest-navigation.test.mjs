import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("regular website desktop navigation uses the guest platform menu", () => {
  const nav = read("app/GuestDesktopNav.tsx");

  assert.match(nav, /href: "\/tours", label: "Experiences"/);
  assert.match(nav, /href: "\/concierge", label: "Ask Roa"/);
  assert.match(nav, /href: "\/community", label: "Community"/);
  assert.match(nav, /href: "\/hotels", label: "Hotels & Stays"/);
  assert.match(nav, /href: "\/transport", label: "Transportation"/);
  assert.match(nav, /href="\/account"/);
  assert.match(nav, /href="\/vendor\/signup"/);
});

test("core regular pages render the shared desktop guest navigation", () => {
  [
    "app/category-page.tsx",
    "app/map/page.tsx",
    "app/concierge/page.tsx",
    "app/community/page.tsx",
    "app/signin/page.tsx",
    "app/support/page.tsx",
    "app/vendors/page.tsx",
    "app/vendors/[id]/page.tsx",
  ].forEach((path) => {
    const source = read(path);

    assert.match(source, /GuestDesktopNav/);
  });
});

test("homepage, listing pages, and floating helpers use regular-site labels", () => {
  const homeHeader = read("app/HomeHeroHeader.tsx");
  const listingPage = read("app/listings/[id]/page.tsx");
  const tripDock = read("app/TripPlannerDock.tsx");
  const roaButton = read("app/GlobalRoaButton.tsx");

  assert.match(homeHeader, /href="\/tours"/);
  assert.match(homeHeader, /href="\/community"/);
  assert.match(homeHeader, /href="\/hotels"/);
  assert.match(homeHeader, /href="\/transport"/);
  assert.match(homeHeader, /Ask Roa/);
  assert.match(listingPage, /href="\/tours"/);
  assert.match(listingPage, /href="\/concierge"/);
  assert.match(tripDock, /Ask Roa/);
  assert.match(tripDock, /My trips/);
  assert.match(roaButton, /Ask Roa/);
  assert.doesNotMatch(tripDock, />Concierge</);
  assert.doesNotMatch(roaButton, /Ask concierge/);
});
