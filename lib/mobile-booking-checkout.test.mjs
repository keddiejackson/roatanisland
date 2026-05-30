import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getMobileBookingCheckoutSteps,
  getMobileBookingStickyCta,
} from "./booking-flow.ts";

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("guides incomplete mobile checkout to the first missing section", () => {
  const steps = getMobileBookingCheckoutSteps({
    fullName: "",
    email: "",
    tourDate: "",
    tourTime: "",
    guests: "",
    pickupPreference: "",
    availabilityBlocked: false,
  });

  assert.equal(steps[0].label, "Guest");
  assert.equal(steps[0].state, "current");
  assert.equal(steps[0].href, "#booking-guest");

  const cta = getMobileBookingStickyCta({
    submitted: false,
    loading: false,
    availabilityBlocked: false,
    readinessScore: 0,
    missingItems: ["Name", "Email"],
    estimatedTotalLabel: "Pending",
  });

  assert.equal(cta.actionLabel, "Add guest details");
  assert.equal(cta.href, "#booking-guest");
  assert.equal(cta.canSubmit, false);
});

test("lets ready mobile checkout submit from the sticky bar", () => {
  const steps = getMobileBookingCheckoutSteps({
    fullName: "Keddie",
    email: "keddie@example.com",
    tourDate: "2026-06-30",
    tourTime: "10:30 AM",
    guests: "2",
    pickupPreference: "Hotel pickup",
    availabilityBlocked: false,
  });
  const cta = getMobileBookingStickyCta({
    submitted: false,
    loading: false,
    availabilityBlocked: false,
    readinessScore: 100,
    missingItems: [],
    estimatedTotalLabel: "$250",
  });

  assert.deepEqual(
    steps.map((step) => step.state),
    ["complete", "complete", "complete", "current"],
  );
  assert.equal(cta.actionLabel, "Send request");
  assert.equal(cta.canSubmit, true);
  assert.equal(cta.priceLabel, "$250");
});

test("booking form exposes mobile checkout UI hooks", () => {
  const bookingForm = source("app/book/BookingForm.tsx");

  assert.match(bookingForm, /Mobile booking checkout/);
  assert.match(bookingForm, /id="booking-request-form"/);
  assert.match(bookingForm, /id="booking-guest"/);
  assert.match(bookingForm, /id="booking-date"/);
  assert.match(bookingForm, /id="booking-pickup"/);
  assert.match(bookingForm, /id="booking-review"/);
  assert.match(bookingForm, /form="booking-request-form"/);
  assert.match(bookingForm, /mobile-safe-bottom/);
});
