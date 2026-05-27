import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGuestChecklist,
  buildGuestNotifications,
  buildGuestProfileBookingPrefill,
  buildGuestProfileConciergePrefill,
  getSavedListingCards,
  getBookingTimeline,
  getGuestCommandSummary,
  getGuestNextBestAction,
  getGuestProfileCompletion,
  getGuestWalletSummary,
  normalizeSavedListingIds,
} from "./guest-command-center.ts";

const completeProfile = {
  name: "Keddie",
  phone: "555-1111",
  pickupArea: "West Bay",
  guests: "4",
  budget: "Moderate",
  style: "Family",
  notes: "Kids and snorkeling.",
  arrivalType: "Cruise",
  arrivalName: "Wonder",
  arrivalTime: "8:00 AM",
  departureTime: "4:00 PM",
  lodging: "Port",
  adults: "2",
  kids: "2",
  mobility: "Easy walking",
  dietary: "No shellfish",
};

const bookings = [
  {
    id: "booking-1",
    status: "confirmed",
    tour_date: "2026-07-10",
    deposit_status: "paid",
  },
  {
    id: "booking-2",
    status: "new",
    tour_date: "2026-07-11",
    deposit_status: "checkout_started",
  },
];

test("normalizes saved listing ids", () => {
  assert.deepEqual(
    normalizeSavedListingIds(["a", 3, "b", "", "a", "c"], 3),
    ["a", "b", "c"],
  );
  assert.deepEqual(normalizeSavedListingIds("bad"), []);
});

test("scores guest profile completion", () => {
  assert.deepEqual(getGuestProfileCompletion(completeProfile), {
    completed: 16,
    total: 16,
    percent: 100,
    label: "Ready",
  });

  assert.equal(
    getGuestProfileCompletion({ ...completeProfile, arrivalName: "" }).label,
    "Almost ready",
  );
});

test("summarizes wallet and command center state", () => {
  assert.deepEqual(getGuestWalletSummary(bookings), {
    paidCount: 1,
    dueCount: 1,
    checkoutStartedCount: 1,
    label: "1 deposit paid",
  });

  assert.deepEqual(
    getGuestCommandSummary({
      bookings,
      plans: [{ id: "plan-1", name: "Cruise day", stops: [{ listingId: "a" }] }],
      savedListingIds: ["a", "b"],
      profile: completeProfile,
    }),
    {
      bookingCount: 2,
      confirmedCount: 1,
      savedListingCount: 2,
      planCount: 1,
      profilePercent: 100,
      walletLabel: "1 deposit paid",
      nextDate: "2026-07-10",
      tripScore: 86,
    },
  );
});

test("chooses the clearest next guest action", () => {
  assert.deepEqual(
    getGuestNextBestAction({
      bookings: [],
      plans: [],
      savedListingIds: [],
      profile: { ...completeProfile, name: "" },
    }),
    {
      label: "Start with the map",
      text: "Save a few tours, beaches, hotels, or transport options before requesting help.",
      href: "/map",
      tone: "info",
    },
  );

  assert.deepEqual(
    getGuestNextBestAction({
      bookings: [],
      plans: [],
      savedListingIds: ["listing-1", "listing-2"],
      profile: completeProfile,
    }),
    {
      label: "Save this as a plan",
      text: "Turn your saved stops into a named itinerary so you can return to it later.",
      href: "/account",
      tone: "warning",
    },
  );

  assert.equal(
    getGuestNextBestAction({
      bookings,
      plans: [{ id: "plan-1", name: "Cruise day", stops: [{ listingId: "a" }] }],
      savedListingIds: ["a"],
      profile: completeProfile,
    }).label,
    "Review confirmed trips",
  );
});

test("builds checklist and notifications", () => {
  const checklist = buildGuestChecklist({
    bookings,
    plans: [],
    savedListingIds: [],
    profile: { ...completeProfile, pickupArea: "" },
  });

  assert.equal(checklist.length, 7);
  assert.equal(checklist.find((item) => item.id === "profile")?.done, true);
  assert.equal(checklist.find((item) => item.id === "arrival")?.done, true);
  assert.equal(checklist.find((item) => item.id === "saved")?.done, false);

  const notifications = buildGuestNotifications({
    bookings,
    plans: [],
    savedListingIds: [],
    profile: { ...completeProfile, pickupArea: "" },
  });

  assert.ok(notifications.some((item) => item.title.includes("deposit")));
  assert.ok(notifications.some((item) => item.title.includes("Save")));
});

test("builds a readable booking timeline", () => {
  assert.deepEqual(
    getBookingTimeline({
      status: "confirmed",
      deposit_status: "paid",
    }).map((item) => [item.label, item.done]),
    [
      ["Request sent", true],
      ["Operator reviewing", true],
      ["Confirmed", true],
      ["Deposit paid", true],
    ],
  );
});

test("builds saved listing cards with real listing names when available", () => {
  assert.deepEqual(
    getSavedListingCards(["private-boat", "missing"], [
      {
        id: "private-boat",
        title: "Private Sunset Boat",
        category: "Private Charters",
        location: "West End",
        price: 325,
      },
    ]),
    [
      {
        id: "private-boat",
        title: "Private Sunset Boat",
        category: "Private Charters",
        location: "West End",
        price: 325,
        isLoaded: true,
      },
      {
        id: "missing",
        title: "Saved stop 2",
        category: "Saved",
        location: "Open map for details",
        price: null,
        isLoaded: false,
      },
    ],
  );
});

test("builds booking and concierge prefill values from guest profile", () => {
  assert.deepEqual(buildGuestProfileBookingPrefill(completeProfile), {
    fullName: "Keddie",
    guests: "4",
    pickupPreference: "Cruise port pickup",
    guestMessage:
      "Pickup area: West Bay\nArrival: Cruise - Wonder at 8:00 AM\nDeparture: 4:00 PM\nLodging: Port\nTravel party: 2 adults, 2 kids\nMobility/accessibility: Easy walking\nDietary/allergy notes: No shellfish\nNotes: Kids and snorkeling.",
  });

  assert.deepEqual(buildGuestProfileConciergePrefill(completeProfile), {
    guests: "4",
    arrivalType: "Cruise",
    pickupArea: "West Bay",
    tripStyle: "Family",
    budget: "Moderate",
    guestName: "Keddie",
    guestPhone: "555-1111",
    notes:
      "Arrival: Cruise - Wonder at 8:00 AM\nDeparture: 4:00 PM\nLodging: Port\nTravel party: 2 adults, 2 kids\nMobility/accessibility: Easy walking\nDietary/allergy notes: No shellfish\nNotes: Kids and snorkeling.",
  });
});
