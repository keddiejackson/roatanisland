import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGuestTripPlanMapUrl,
  guestTripPlanFromRow,
  getGuestTripPlanAdminSummary,
  getGuestTripPlanSummary,
  normalizeGuestTripPlanInput,
} from "./guest-trip-plans.ts";

const rawPlan = {
  name: "  Cruise port plan  ",
  pickupArea: "  Coxen Hole Port  ",
  arrivalType: " Cruise port ",
  tripDate: "2026-07-18",
  tripTime: "10:30 AM",
  guestCount: "6",
  source: "map",
  stops: [
    {
      listingId: "listing-1",
      title: "  Private snorkel charter  ",
      timeBlock: "Morning",
      note: "  pickup first  ",
      location: "West Bay",
      category: "Tours",
      price: 250,
    },
    {
      listingId: "",
      title: "Ignored",
    },
  ],
};

test("normalizes a guest map plan before saving", () => {
  assert.deepEqual(normalizeGuestTripPlanInput(rawPlan), {
    name: "Cruise port plan",
    pickupArea: "Coxen Hole Port",
    arrivalType: "Cruise port",
    tripDate: "2026-07-18",
    tripTime: "10:30 AM",
    guestCount: 6,
    source: "map",
    stops: [
      {
        listingId: "listing-1",
        title: "Private snorkel charter",
        timeBlock: "Morning",
        note: "pickup first",
        location: "West Bay",
        category: "Tours",
        price: 250,
      },
    ],
  });
});

test("summarizes saved plans for the guest and admin", () => {
  const normalized = normalizeGuestTripPlanInput(rawPlan);

  assert.equal(
    getGuestTripPlanSummary(normalized),
    "1 stop / Coxen Hole Port / 2026-07-18",
  );
  assert.deepEqual(getGuestTripPlanAdminSummary([normalized]), {
    total: 1,
    conciergeRequested: 0,
    saved: 1,
    stopCount: 1,
    label: "1 saved guest plan",
  });
});

test("builds a map link that reopens saved stops", () => {
  assert.equal(
    buildGuestTripPlanMapUrl(normalizeGuestTripPlanInput(rawPlan)),
    "/map?trip=listing-1",
  );
});

test("maps database rows into guest plan cards", () => {
  assert.deepEqual(
    guestTripPlanFromRow({
      id: "plan-1",
      email: "guest@example.com",
      name: "Cruise plan",
      pickup_area: "Coxen Hole Port",
      arrival_type: "Cruise port",
      trip_date: "2026-07-18",
      trip_time: "10:30 AM",
      guest_count: 6,
      source: "map",
      status: "saved",
      stops: normalizeGuestTripPlanInput(rawPlan).stops,
      created_at: "2026-06-01T12:00:00Z",
      updated_at: "2026-06-02T12:00:00Z",
    }).pickupArea,
    "Coxen Hole Port",
  );
});
