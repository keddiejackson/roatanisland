import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getBookingConfidenceCommandCenter,
  getBookingOpsPriority,
  getBookingSuccessNextSteps,
} from "./booking-flow.ts";

test("builds a luxury booking confidence command center", () => {
  const ready = getBookingConfidenceCommandCenter({
    fullName: "Keddie Jackson",
    email: "keddie@example.com",
    tourDate: "2026-07-01",
    tourTime: "10:30 AM",
    guests: "4",
    pickupPreference: "Cruise port pickup",
    guestMessage: "Ship leaves at 5 PM.",
    estimatedTotalLabel: "$480",
    availabilityTone: "available",
    hasListing: true,
    depositsEnabled: true,
  });

  assert.equal(ready.label, "Guest-ready request");
  assert.equal(ready.score, 100);
  assert.equal(ready.primaryAction, "Send request");
  assert.ok(ready.signals.some((signal) => signal.label === "Cruise timing"));
  assert.ok(ready.signals.some((signal) => signal.label === "Payment clarity"));
});

test("flags missing booking confidence details without scary wording", () => {
  const needsDetails = getBookingConfidenceCommandCenter({
    fullName: "",
    email: "guest@example.com",
    tourDate: "",
    tourTime: "",
    guests: "",
    pickupPreference: "",
    guestMessage: "",
    estimatedTotalLabel: "Pending",
    availabilityTone: "choose",
    hasListing: false,
    depositsEnabled: false,
  });

  assert.equal(needsDetails.label, "Needs a few details");
  assert.equal(needsDetails.primaryAction, "Add trip basics");
  assert.ok(needsDetails.missingItems.includes("Date"));
  assert.ok(needsDetails.signals.some((signal) => signal.label === "Pickup clarity"));
});

test("creates success next steps and operations priorities", () => {
  assert.deepEqual(
    getBookingSuccessNextSteps({
      bookingId: "booking-1",
      depositsEnabled: true,
      hasEmail: true,
    }).map((step) => step.label),
    [
      "Open booking status",
      "Watch for operator reply",
      "Review payment options",
      "Create guest account",
    ],
  );

  assert.deepEqual(
    getBookingOpsPriority({
      status: "new",
      depositStatus: "not_requested",
      threadNeedsResponse: true,
      paymentIssue: false,
      tourDate: "2026-06-01",
    }),
    {
      label: "Reply first",
      text: "Guest is waiting for an answer. Open the booking thread before changing anything else.",
      tone: "urgent",
    },
  );
});

test("booking confidence cues are visible across the booking system", () => {
  const bookingFormSource = readFileSync("app/book/BookingForm.tsx", "utf8");
  const successSource = readFileSync("app/book/success/page.tsx", "utf8");
  const statusSource = readFileSync("app/book/status/[id]/page.tsx", "utf8");
  const accountSource = readFileSync("app/account/page.tsx", "utf8");
  const adminBookingsSource = readFileSync("app/admin/bookings/page.tsx", "utf8");
  const vendorDashboardSource = readFileSync("app/vendor/dashboard/page.tsx", "utf8");

  assert.match(bookingFormSource, /Booking Confidence Command Center/);
  assert.match(bookingFormSource, /Smart trip signals/);
  assert.match(successSource, /Your private trip command center/);
  assert.match(statusSource, /Travel confidence snapshot/);
  assert.match(accountSource, /Guest booking confidence/);
  assert.match(adminBookingsSource, /getBookingOpsPriority/);
  assert.match(vendorDashboardSource, /Guest confidence cue/);
});
