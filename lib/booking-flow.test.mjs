import assert from "node:assert/strict";
import test from "node:test";
import {
  bookingConversionChecklist,
  bookingStatusSteps,
  bookingNextAction,
  calculateAddonTotalCents,
  composeBookingGuestMessage,
  getBookingCheckoutReadiness,
  getBookingRecoveryPrompt,
  getBookingTrustSteps,
  estimateBookingTotalCents,
  formatBookingCents,
  formatBookingStatus,
  formatDepositStatus,
} from "./booking-flow.ts";

test("formats booking money values with safe fallbacks", () => {
  assert.equal(formatBookingCents(12500), "$125");
  assert.equal(formatBookingCents(12550), "$125.50");
  assert.equal(formatBookingCents(null), "Pending");
  assert.equal(formatBookingCents(undefined), "Pending");
});

test("calculates add-on totals from selected add-ons", () => {
  assert.equal(
    calculateAddonTotalCents([
      { id: "a", name: "Lunch", price_cents: 2500 },
      { id: "b", name: "Pickup", price_cents: 1500 },
    ]),
    4000,
  );
});

test("estimates booking total from listing price, guests, and add-ons", () => {
  assert.equal(
    estimateBookingTotalCents({
      price: 75,
      guests: 3,
      selectedAddons: [{ id: "a", name: "Lunch", price_cents: 2500 }],
    }),
    25000,
  );

  assert.equal(
    estimateBookingTotalCents({
      price: null,
      guests: 3,
      selectedAddons: [{ id: "a", name: "Lunch", price_cents: 2500 }],
    }),
    2500,
  );
});

test("formats booking and deposit statuses for travelers", () => {
  assert.equal(formatBookingStatus("new"), "Request received");
  assert.equal(formatBookingStatus("confirmed"), "Confirmed");
  assert.equal(formatBookingStatus("cancelled"), "Cancelled");
  assert.equal(formatBookingStatus("unknown_status"), "Unknown status");
  assert.equal(formatDepositStatus(null), "Not requested");
  assert.equal(formatDepositStatus("paid"), "Paid");
});

test("builds tracker steps for the current booking status", () => {
  assert.deepEqual(
    bookingStatusSteps("confirmed").map((step) => [
      step.label,
      step.state,
    ]),
    [
      ["Request received", "complete"],
      ["Operator reviewing", "complete"],
      ["Confirmed", "current"],
      ["Completed", "upcoming"],
    ],
  );

  assert.equal(bookingStatusSteps("cancelled")[0].state, "current");
});

test("combines pickup preference with the guest message", () => {
  assert.equal(
    composeBookingGuestMessage({
      pickupPreference: "Airport pickup",
      guestMessage: "Landing at noon.",
    }),
    "Pickup preference: Airport pickup\n\nGuest message: Landing at noon.",
  );

  assert.equal(
    composeBookingGuestMessage({
      pickupPreference: "",
      guestMessage: "Vegetarian lunch please.",
    }),
    "Vegetarian lunch please.",
  );
});

test("returns the clearest next booking action for guests", () => {
  assert.deepEqual(bookingNextAction({ status: "new", depositStatus: null }), {
    label: "Waiting on operator review",
    text: "The operator checks availability and will confirm or follow up.",
    tone: "review",
  });

  assert.equal(
    bookingNextAction({ status: "confirmed", depositStatus: "paid" }).label,
    "Confirmed and paid",
  );

  assert.equal(
    bookingNextAction({ status: "cancelled", depositStatus: "paid" }).tone,
    "cancelled",
  );

  assert.deepEqual(
    bookingNextAction({
      status: "completed",
      depositStatus: "paid",
      canReview: true,
    }),
    {
      label: "Share your review",
      text: "Your trip is complete. Leave a review to help the next traveler choose with confidence.",
      tone: "complete",
    },
  );
});

test("summarizes booking checkout readiness", () => {
  assert.deepEqual(
    getBookingCheckoutReadiness({
      fullName: "Keddie Jackson",
      email: "keddie@example.com",
      tourDate: "2026-07-01",
      tourTime: "10:30 AM",
      guests: "4",
      pickupPreference: "Airport pickup",
    }),
    {
      score: 100,
      label: "Ready to send",
      missingItems: [],
    },
  );

  assert.deepEqual(
    getBookingCheckoutReadiness({
      fullName: "",
      email: "",
      tourDate: "",
      tourTime: "",
      guests: "",
      pickupPreference: "",
    }),
    {
      score: 0,
      label: "Needs details",
      missingItems: [
        "Name",
        "Email",
        "Date",
        "Time",
        "Guest count",
        "Pickup preference",
      ],
    },
  );
});

test("builds booking conversion checklist and trust steps", () => {
  assert.deepEqual(
    bookingConversionChecklist({
      hasListing: true,
      hasAvailability: true,
      hasAddons: true,
      hasEstimatedTotal: true,
    }).map((item) => [item.label, item.done]),
    [
      ["Experience selected", true],
      ["Availability checked", true],
      ["Add-ons reviewed", true],
      ["Total previewed", true],
    ],
  );

  assert.deepEqual(
    getBookingTrustSteps().map((step) => step.label),
    [
      "Send request",
      "Local operator confirms",
      "Pay only when ready",
      "Track everything",
    ],
  );
});

test("returns a booking recovery prompt when guests leave details unfinished", () => {
  assert.deepEqual(
    getBookingRecoveryPrompt({
      fullName: "Keddie",
      email: "",
      tourDate: "2026-07-01",
      tourTime: "",
      guests: "4",
    }),
    {
      label: "Finish your request",
      text: "Your name, date, and guest count are saved on this device. Add the missing details when you are ready.",
      shouldShow: true,
    },
  );

  assert.equal(
    getBookingRecoveryPrompt({
      fullName: "",
      email: "",
      tourDate: "",
      tourTime: "",
      guests: "",
    }).shouldShow,
    false,
  );
});
