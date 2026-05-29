import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  applyConciergeTripTemplate,
  buildConciergePlan,
  getConciergeLeadReadiness,
  getConciergeMatches,
  getConciergePlanMetrics,
  getConciergeTripTemplates,
} from "./guest-concierge.ts";

const root = new URL("../", import.meta.url);

function readProjectFile(path) {
  return readFileSync(new URL(path, root), "utf8");
}

const listings = [
  {
    id: "private-boat",
    title: "Private Sunset Boat",
    category: "Private Charters",
    location: "West End",
    description: "Luxury private charter with sunset snorkel.",
    price: 325,
    rating: 5,
    reviews_count: 12,
    tour_times: ["4:30 PM"],
    max_guests: 6,
  },
  {
    id: "cruise-tour",
    title: "Cruise Port Island Tour",
    category: "Tours",
    location: "Coxen Hole",
    description: "Cruise port friendly island highlights with beach time.",
    price: 85,
    rating: 4.9,
    reviews_count: 18,
    tour_times: ["9:00 AM"],
    max_guests: 8,
  },
  {
    id: "airport-transfer",
    title: "Airport Transfer",
    category: "Transport",
    location: "Roatan Airport",
    description: "Airport pickup and luggage friendly transfer.",
    price: 45,
    rating: 4.7,
    reviews_count: 4,
    tour_times: ["Any time"],
    max_guests: 5,
  },
];

test("concierge trip templates include premium planning paths", () => {
  const templates = getConciergeTripTemplates();

  assert.ok(templates.length >= 5);
  assert.ok(templates.some((template) => template.id === "luxury-private-day"));
  assert.deepEqual(
    applyConciergeTripTemplate("luxury-private-day", {
      name: "Custom",
      arrivalType: "Cruise",
      pickupArea: "Coxen Hole",
      tripStyle: "Family",
      budget: "Moderate",
      interests: ["beach"],
      notes: "",
    }),
    {
      name: "Luxury private Roatan day",
      arrivalType: "Staying on island",
      pickupArea: "West End",
      tripStyle: "Luxury",
      budget: "Luxury",
      interests: ["private", "snorkel", "sunset"],
      notes: "Private, polished, flexible timing, premium operators preferred.",
    },
  );
});

test("concierge plan metrics explain confidence and trip value", () => {
  const matches = getConciergeMatches(listings, {
    arrivalType: "Staying on island",
    pickupArea: "West End",
    tripStyle: "Luxury",
    budget: "Luxury",
    guests: "4",
    interests: ["private", "sunset"],
  });
  const plan = buildConciergePlan({
    name: "Luxury Day",
    date: "2026-07-10",
    guests: "4",
    pickupArea: "West End",
    arrivalType: "Staying on island",
    matches,
  });
  const metrics = getConciergePlanMetrics({ plan, matches });

  assert.equal(metrics.stopCount, 3);
  assert.equal(metrics.estimatedTripValueLabel, "$455");
  assert.equal(metrics.confidenceLabel, "Strong fit");
  assert.ok(metrics.highlights.includes("Private Sunset Boat"));
});

test("concierge lead readiness catches missing contact details", () => {
  const plan = buildConciergePlan({
    name: "Cruise Day",
    date: "",
    guests: "4",
    pickupArea: "Coxen Hole",
    arrivalType: "Cruise",
    matches: getConciergeMatches(listings, {
      arrivalType: "Cruise",
      pickupArea: "Coxen Hole",
      tripStyle: "Family",
      budget: "Moderate",
      guests: "4",
      interests: ["beach", "cruise"],
    }),
  });

  assert.deepEqual(
    getConciergeLeadReadiness({
      guestName: "",
      guestEmail: "",
      guestPhone: "",
      plan,
    }),
    {
      label: "Needs contact details",
      score: 67,
      missingItems: ["Name", "Email"],
    },
  );
});

test("concierge builder pages include luxury marketplace sections", () => {
  const page = readProjectFile("app/concierge/page.tsx");
  const planner = readProjectFile("app/concierge/ConciergePlanner.tsx");

  assert.match(page, /Luxury Concierge Trip Builder/);
  assert.match(planner, /Instant trip styles/);
  assert.match(planner, /Concierge readiness/);
  assert.match(planner, /Estimated trip value/);
  assert.match(planner, /Shareable plan link/);
  assert.match(planner, /Admin-ready lead/);
});
