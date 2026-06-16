import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGuestTripPlanConciergeRequest,
  buildGuestTripPlanMapUrl,
  guestTripPlanFromRow,
  getGuestTripPlanAdminSummary,
  getGuestTripPlanSourceLabel,
  getGuestTripPlanStatusLabel,
  getGuestTripPlanSummary,
  normalizeGuestTripPlanInput,
} from "./guest-trip-plans.ts";

const rawPlan = {
  name: "  Cruise port plan  ",
  pickupArea: "  Port of Roatan / Coxen Hole  ",
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
    pickupArea: "Port of Roatan / Coxen Hole",
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
    "1 stop / Port of Roatan / Coxen Hole / 2026-07-18",
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

test("labels Roa trip plans and concierge statuses for guests", () => {
  assert.equal(getGuestTripPlanSourceLabel("roa"), "Roa plan");
  assert.equal(getGuestTripPlanStatusLabel("reviewing"), "Being reviewed");
  assert.equal(getGuestTripPlanStatusLabel("contacted"), "Vendor contacted");
  assert.equal(getGuestTripPlanStatusLabel("quoted"), "Ready to book");
});

test("maps database rows into guest plan cards", () => {
  assert.deepEqual(
    guestTripPlanFromRow({
      id: "plan-1",
      email: "guest@example.com",
      name: "Cruise plan",
      pickup_area: "Port of Roatan / Coxen Hole",
      arrival_type: "Cruise port",
      trip_date: "2026-07-18",
      trip_time: "10:30 AM",
      guest_count: 6,
      source: "map",
      status: "saved",
      concierge_lead_id: null,
      stops: normalizeGuestTripPlanInput(rawPlan).stops,
      created_at: "2026-06-01T12:00:00Z",
      updated_at: "2026-06-02T12:00:00Z",
    }).pickupArea,
    "Port of Roatan / Coxen Hole",
  );
});

test("builds a concierge lead request from a saved guest plan", () => {
  const plan = guestTripPlanFromRow({
    id: "plan-1",
    email: "guest@example.com",
    name: "Cruise plan",
    pickup_area: "Port of Roatan / Coxen Hole",
    arrival_type: "Cruise port",
    trip_date: "2026-07-18",
    trip_time: "10:30 AM",
    guest_count: 6,
    source: "map",
    status: "saved",
    concierge_lead_id: null,
    stops: normalizeGuestTripPlanInput(rawPlan).stops,
    created_at: "2026-06-01T12:00:00Z",
    updated_at: "2026-06-02T12:00:00Z",
  });

  const request = buildGuestTripPlanConciergeRequest(
    plan,
    "guest@example.com",
    "Guest One",
  );

  assert.equal(request.leadType, "concierge_plan");
  assert.equal(request.name, "Guest One");
  assert.equal(request.email, "guest@example.com");
  assert.equal(request.interest, "Saved map plan");
  assert.equal(request.travelDate, "2026-07-18");
  assert.equal(request.guests, 6);
  assert.equal(request.sourcePath, "/account#trip-plan-plan-1");
  assert.match(request.message, /Private snorkel charter/);
  assert.deepEqual(request.plan, {
    source: "guest_trip_plan",
    tripPlanId: "plan-1",
    planName: "Cruise plan",
    summary: "1 stop / Port of Roatan / Coxen Hole / 2026-07-18",
    pickupArea: "Port of Roatan / Coxen Hole",
    arrivalType: "Cruise port",
    tripDate: "2026-07-18",
    tripTime: "10:30 AM",
    guestCount: 6,
    stops: plan.stops,
  });
});
