import assert from "node:assert/strict";
import test from "node:test";
import {
  checkBookingAvailability,
  getMinimumNoticeDateValue,
  normalizeTourTimes,
} from "./booking-availability.ts";

const baseListing = {
  tour_times: ["9:00 AM", "1:00 PM"],
  blocked_dates: ["2026-06-15"],
  max_guests: 8,
  minimum_notice_hours: 24,
};

test("normalizes vendor tour times without adding defaults", () => {
  assert.deepEqual(normalizeTourTimes([" 9:00 AM ", "", "9:00 AM", "1:00 PM"]), [
    "9:00 AM",
    "1:00 PM",
  ]);
  assert.deepEqual(normalizeTourTimes(null), []);
});

test("blocks booking requests on vendor blocked dates", () => {
  const result = checkBookingAvailability({
    listing: baseListing,
    tourDate: "2026-06-15",
    tourTime: "9:00 AM",
    guests: 2,
    now: new Date("2026-06-01T12:00:00"),
  });

  assert.equal(result.ok, false);
  assert.equal(result.tone, "blocked");
  assert.match(result.text, /date is not available/i);
});

test("requires one of the vendor listed tour times when times exist", () => {
  const result = checkBookingAvailability({
    listing: baseListing,
    tourDate: "2026-06-16",
    tourTime: "5:00 PM",
    guests: 2,
    now: new Date("2026-06-01T12:00:00"),
  });

  assert.equal(result.ok, false);
  assert.equal(result.tone, "blocked");
  assert.deepEqual(result.allowedTourTimes, ["9:00 AM", "1:00 PM"]);
  assert.match(result.text, /available times/i);
});

test("enforces max guests, reserved capacity, and minimum notice", () => {
  assert.match(
    checkBookingAvailability({
      listing: baseListing,
      tourDate: "2026-06-16",
      tourTime: "9:00 AM",
      guests: 9,
      now: new Date("2026-06-01T12:00:00"),
    }).text,
    /up to 8 guests/i,
  );

  assert.match(
    checkBookingAvailability({
      listing: baseListing,
      tourDate: "2026-06-16",
      tourTime: "9:00 AM",
      guests: 4,
      reservedGuests: 6,
      now: new Date("2026-06-01T12:00:00"),
    }).text,
    /2 spots left/i,
  );

  assert.match(
    checkBookingAvailability({
      listing: baseListing,
      tourDate: "2026-06-16",
      tourTime: "9:00 AM",
      guests: 2,
      now: new Date("2026-06-15T18:00:00"),
    }).text,
    /24 hours/i,
  );
});

test("allows custom times when a vendor has not listed fixed times", () => {
  const result = checkBookingAvailability({
    listing: { ...baseListing, tour_times: [] },
    tourDate: "2026-06-16",
    tourTime: "5:00 PM",
    guests: 2,
    now: new Date("2026-06-01T12:00:00"),
  });

  assert.equal(result.ok, true);
  assert.equal(result.tone, "available");
});

test("builds minimum notice date value for form date fields", () => {
  assert.equal(
    getMinimumNoticeDateValue(36, new Date("2026-06-01T12:00:00")),
    "2026-06-03",
  );
});
